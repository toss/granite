#include "FileReader.h"

#include <cerrno>
#include <cstring>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

namespace granite {
namespace io {

FdGuard::~FdGuard() {
  if (fd >= 0) close(fd);
}

FileReaderError::FileReaderError(ErrorKind kind, const std::string& message,
                                 int errno_value)
    : std::runtime_error(message), kind_(kind), errno_value_(errno_value) {}

std::string ReadFileToString(const std::string& path) {
  int fd = open(path.c_str(), O_RDONLY);
  if (fd < 0) {
    int saved_errno = errno;
    throw FileReaderError(
        ErrorKind::kNotFound,
        "Cannot open file: " + path + " (errno: " +
            std::to_string(saved_errno) + ", " + strerror(saved_errno) + ")",
        saved_errno);
  }
  FdGuard guard{fd};

  struct stat st;
  if (fstat(fd, &st) < 0) {
    int saved_errno = errno;
    throw FileReaderError(
        ErrorKind::kStatFailed,
        "Cannot stat file: " + path + " (errno: " +
            std::to_string(saved_errno) + ", " + strerror(saved_errno) + ")",
        saved_errno);
  }

  size_t file_size = static_cast<size_t>(st.st_size);
  if (file_size == 0) {
    return std::string();
  }

  std::string source;
  try {
    source.resize(file_size);
  } catch (const std::bad_alloc&) {
    throw FileReaderError(
        ErrorKind::kAllocationFailed,
        "Cannot allocate " + std::to_string(file_size) +
            " bytes for file: " + path);
  }

  size_t total_read = 0;
  while (total_read < file_size) {
    ssize_t bytes_read =
        read(fd, &source[total_read], file_size - total_read);
    if (bytes_read < 0) {
      if (errno == EINTR) continue;
      int saved_errno = errno;
      throw FileReaderError(
          ErrorKind::kReadFailed,
          "Error reading file: " + path + " at offset " +
              std::to_string(total_read) + " (errno: " +
              std::to_string(saved_errno) + ", " +
              strerror(saved_errno) + ")",
          saved_errno);
    }
    if (bytes_read == 0) break;
    total_read += static_cast<size_t>(bytes_read);
  }

  if (total_read < file_size) {
    source.resize(total_read);
  }

  return source;
}

}  // namespace io
}  // namespace granite
