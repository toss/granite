#include "FileReader.h"

#include <filesystem>
#include <fstream>

#include <gtest/gtest.h>

namespace fs = std::filesystem;

namespace granite::microfrontend::io {

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

  const std::string loadedBytecode = readFileToMemory(path.string());
  ASSERT_TRUE(fs::remove(path));
  ASSERT_FALSE(fs::exists(path));

  EXPECT_EQ(loadedBytecode, bytecode);
}

}
