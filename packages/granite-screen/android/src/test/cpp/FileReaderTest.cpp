#include <gtest/gtest.h>
#include "FileReader.h"

#include <fstream>
#include <filesystem>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

namespace fs = std::filesystem;
using namespace granite::io;

// Hermes Bytecode magic header: c6 1f bc 03
static const char kHermesMagic[] = {'\xc6', '\x1f', '\xbc', '\x03'};

class FileReaderTest : public ::testing::Test {
 protected:
  fs::path temp_dir_;

  void SetUp() override {
    temp_dir_ = fs::temp_directory_path() / "granite_file_reader_test";
    fs::create_directories(temp_dir_);
  }

  void TearDown() override {
    fs::remove_all(temp_dir_);
  }

  fs::path CreateTempFile(const std::string& name,
                          const std::string& content) {
    auto path = temp_dir_ / name;
    std::ofstream ofs(path, std::ios::binary);
    ofs.write(content.data(), content.size());
    ofs.close();
    return path;
  }

  // Create a fake HBC file with magic header + payload.
  fs::path CreateFakeHbcFile(const std::string& name,
                             size_t payload_size = 64) {
    std::string content(kHermesMagic, sizeof(kHermesMagic));
    for (size_t i = 0; i < payload_size; ++i) {
      content.push_back(static_cast<char>(i & 0xFF));
    }
    return CreateTempFile(name, content);
  }
};

// 1. Happy path: read HBC bundle with magic header.
TEST_F(FileReaderTest, ReadsHbcBundleCorrectly) {
  auto path = CreateFakeHbcFile("bundle.hbc", 128);

  std::string result = ReadFileToString(path.string());
  EXPECT_EQ(result.size(), sizeof(kHermesMagic) + 128);
  // Verify Hermes magic header is preserved.
  EXPECT_EQ(result[0], '\xc6');
  EXPECT_EQ(result[1], '\x1f');
  EXPECT_EQ(result[2], '\xbc');
  EXPECT_EQ(result[3], '\x03');
}

// 2. FdGuard RAII: fd is closed after destruction.
TEST_F(FileReaderTest, FdGuardClosesFileDescriptor) {
  auto path = CreateFakeHbcFile("guard_test.hbc");
  int fd = open(path.c_str(), O_RDONLY);
  ASSERT_GE(fd, 0);

  {
    FdGuard guard{fd};
    struct stat st;
    EXPECT_EQ(fstat(fd, &st), 0);
  }
  // fd should be closed after FdGuard destruction.
  struct stat st;
  EXPECT_EQ(fstat(fd, &st), -1);
  EXPECT_EQ(errno, EBADF);
}

// 3. Bundle file not found.
TEST_F(FileReaderTest, ThrowsNotFoundForMissingBundle) {
  std::string missing_path = (temp_dir_ / "nonexistent.hbc").string();

  try {
    ReadFileToString(missing_path);
    FAIL() << "Expected FileReaderError";
  } catch (const FileReaderError& e) {
    EXPECT_EQ(e.kind(), ErrorKind::kNotFound);
    EXPECT_EQ(e.errno_value(), ENOENT);
    EXPECT_NE(std::string(e.what()).find(missing_path), std::string::npos)
        << "Error message should contain file path";
  }
}

// 4. Bundle file permission denied.
TEST_F(FileReaderTest, ThrowsNotFoundForPermissionDenied) {
  if (getuid() == 0) {
    GTEST_SKIP() << "Skipping permission test when running as root";
  }

  auto path = CreateFakeHbcFile("no_access.hbc");
  chmod(path.c_str(), 0000);

  try {
    ReadFileToString(path.string());
    FAIL() << "Expected FileReaderError";
  } catch (const FileReaderError& e) {
    EXPECT_EQ(e.kind(), ErrorKind::kNotFound);
    EXPECT_EQ(e.errno_value(), EACCES);
  }

  // Restore permissions for cleanup.
  chmod(path.c_str(), 0644);
}

// 5. Empty bundle returns empty string (domain policy handled by caller).
TEST_F(FileReaderTest, ReturnsEmptyStringForEmptyBundle) {
  auto path = CreateTempFile("empty.hbc", "");

  std::string result = ReadFileToString(path.string());
  EXPECT_TRUE(result.empty());
}

// 6. Large HBC bundle (> 4KB, multi-read territory).
TEST_F(FileReaderTest, ReadsLargeHbcBundleCorrectly) {
  // Simulate a realistic HBC bundle: magic header + 8KB bytecode payload.
  std::string content(kHermesMagic, sizeof(kHermesMagic));
  for (size_t i = 0; i < 8192; ++i) {
    content.push_back(static_cast<char>(i & 0xFF));
  }
  auto path = CreateTempFile("large_bundle.hbc", content);

  std::string result = ReadFileToString(path.string());
  EXPECT_EQ(result.size(), content.size());
  EXPECT_EQ(result, content);
  // Verify magic header survived the read.
  EXPECT_EQ(result.substr(0, 4),
            std::string(kHermesMagic, sizeof(kHermesMagic)));
}

// 7. Binary content with null bytes (common in HBC bytecode).
TEST_F(FileReaderTest, ReadsBinaryBytecodeWithNullBytes) {
  std::string bytecode(kHermesMagic, sizeof(kHermesMagic));
  bytecode += std::string("\x00\x00\x00\x00", 4);  // null-filled section
  bytecode += std::string("\x01\x02\x00\x04", 4);  // mixed with nulls
  bytecode += std::string(32, '\0');                 // zero-padding block
  auto path = CreateTempFile("nullbytes.hbc", bytecode);

  std::string result = ReadFileToString(path.string());
  EXPECT_EQ(result.size(), bytecode.size());
  EXPECT_EQ(result, bytecode);
}

// 8. Error message contains bundle file path for diagnostics.
TEST_F(FileReaderTest, ErrorMessageContainsBundlePath) {
  std::string missing_path = (temp_dir_ / "missing_bundle.hbc").string();

  try {
    ReadFileToString(missing_path);
    FAIL() << "Expected FileReaderError";
  } catch (const FileReaderError& e) {
    std::string msg = e.what();
    EXPECT_NE(msg.find("missing_bundle.hbc"), std::string::npos)
        << "Error message should contain the bundle file name. Got: " << msg;
    EXPECT_NE(msg.find("errno"), std::string::npos)
        << "Error message should contain errno info. Got: " << msg;
  }
}

// 9. FdGuard with invalid fd does not crash.
TEST_F(FileReaderTest, FdGuardHandlesInvalidFd) {
  { FdGuard guard{-1}; }
  // Should not crash or throw — just a no-op close.
  SUCCEED();
}
