#include "FileReader.h"

#include <filesystem>
#include <fstream>

#include <gtest/gtest.h>

namespace fs = std::filesystem;

namespace granite::microfrontend::io {

static std::string contents(const FileBytes &bytes) {
  return bytes.size == 0
             ? std::string{}
             : std::string(reinterpret_cast<const char *>(bytes.data.get()),
                           bytes.size);
}

class FileReaderTest : public ::testing::Test {
protected:
  void SetUp() override {
    tempDirectory =
        fs::temp_directory_path() / "granite_micro_frontend_file_reader_test";
    fs::create_directories(tempDirectory);
  }

  void TearDown() override { fs::remove_all(tempDirectory); }

  fs::path createBundle(const std::string &content) const {
    const auto path = tempDirectory / "remote.hbc";
    std::ofstream output(path, std::ios::binary);
    output.write(content.data(), static_cast<std::streamsize>(content.size()));
    output.close();
    return path;
  }

  fs::path tempDirectory;
};

TEST_F(FileReaderTest, KeepsBundleBytesAfterSourceFileIsDeleted) {
  const std::string bytecode{"\xc6\x1f\xbc\x03\x00\x01\x00\x02", 8};
  const auto path = createBundle(bytecode);

  const auto loadedBytecode = readFileToMemory(path.string());
  ASSERT_TRUE(fs::remove(path));
  ASSERT_FALSE(fs::exists(path));

  EXPECT_EQ(contents(loadedBytecode), bytecode);
}

TEST_F(FileReaderTest, KeepsSnapshotWhenSourceIsOverwrittenAndTruncated) {
  const std::string original(32 * 1024 + 7, 'x');
  const auto path = createBundle(original);
  const auto snapshot = readFileToMemory(path.string());

  createBundle("changed");
  fs::resize_file(path, 0);
  EXPECT_EQ(contents(snapshot), original);
}

TEST_F(FileReaderTest, KeepsSnapshotWhenSourceIsAtomicallyReplaced) {
  const auto path = createBundle("old bytes");
  const auto snapshot = readFileToMemory(path.string());
  const auto replacement = tempDirectory / "replacement.hbc";
  {
    std::ofstream output(replacement);
    output << "new bytes";
  }
  fs::rename(replacement, path);

  EXPECT_EQ(contents(snapshot), "old bytes");
  EXPECT_EQ(contents(readFileToMemory(path.string())), "new bytes");
}

TEST_F(FileReaderTest, PreservesBinaryBytesAcrossPages) {
  std::string expected(32 * 1024 + 7, '\0');
  for (size_t index = 0; index < expected.size(); ++index) {
    expected[index] = static_cast<char>(index % 251);
  }
  EXPECT_EQ(contents(readFileToMemory(createBundle(expected).string())),
            expected);
}

TEST_F(FileReaderTest, EmptyFileHasNoBytes) {
  EXPECT_EQ(readFileToMemory(createBundle("").string()).size, 0);
}

TEST_F(FileReaderTest, MissingFileReportsNotFound) {
  try {
    readFileToMemory((tempDirectory / "missing.hbc").string());
    FAIL() << "Expected a missing-file error";
  } catch (const FileReaderError &error) {
    EXPECT_EQ(error.kind(), FileReaderErrorKind::NotFound);
  }
}

TEST_F(FileReaderTest, RejectsDirectories) {
  EXPECT_THROW(readFileToMemory(tempDirectory.string()), FileReaderError);
}

} // namespace granite::microfrontend::io
