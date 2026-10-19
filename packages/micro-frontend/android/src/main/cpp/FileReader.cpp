#include "FileReader.h"

#include <cerrno>
#include <cstring>
#include <fcntl.h>
#include <limits>
#include <new>
#include <sys/stat.h>
#include <unistd.h>

namespace granite::microfrontend::io {
namespace {

class FileDescriptor final {
public:
  explicit FileDescriptor(int value) : value_(value) {}
  ~FileDescriptor() { close(value_); }

  FileDescriptor(const FileDescriptor &) = delete;
  FileDescriptor &operator=(const FileDescriptor &) = delete;

  int get() const { return value_; }

private:
  int value_;
};

std::string errorMessage(const std::string &message, const std::string &path,
                         int errorNumber) {
  return message + ": " + path + " (" + std::strerror(errorNumber) + ")";
}

} // namespace

FileReaderError::FileReaderError(FileReaderErrorKind kind,
                                 const std::string &message)
    : std::runtime_error(message), kind_(kind) {}

FileReaderErrorKind FileReaderError::kind() const { return kind_; }

FileBytes readFileToMemory(const std::string &path) {
  FileBytes source{nullptr, 0};

  {
    const int fileDescriptor = open(path.c_str(), O_RDONLY | O_CLOEXEC);
    if (fileDescriptor < 0) {
      const int errorNumber = errno;
      throw FileReaderError(
          FileReaderErrorKind::NotFound,
          errorMessage("Bundle file cannot be opened", path, errorNumber));
    }
    FileDescriptor file(fileDescriptor);

    struct stat fileStat {};
    if (fstat(file.get(), &fileStat) < 0) {
      const int errorNumber = errno;
      throw FileReaderError(
          FileReaderErrorKind::StatFailed,
          errorMessage("Bundle file cannot be inspected", path, errorNumber));
    }

    if (!S_ISREG(fileStat.st_mode) || fileStat.st_size < 0) {
      throw FileReaderError(FileReaderErrorKind::ReadFailed,
                            "Bundle is not a regular file: " + path);
    }
    if (static_cast<uintmax_t>(fileStat.st_size) >
        std::numeric_limits<size_t>::max()) {
      throw FileReaderError(FileReaderErrorKind::AllocationFailed,
                            "Bundle file is too large: " + path);
    }
    source.size = static_cast<size_t>(fileStat.st_size);
    try {
      // read() fills the buffer; value-initializing it would touch every byte
      // twice.
      if (source.size != 0) {
        source.data = std::unique_ptr<uint8_t[]>(new uint8_t[source.size]);
      }
    } catch (const std::bad_alloc &) {
      throw FileReaderError(FileReaderErrorKind::AllocationFailed,
                            "Bundle file cannot fit in memory: " + path);
    }

    size_t offset = 0;
    while (offset < source.size) {
      const ssize_t bytesRead =
          read(file.get(), source.data.get() + offset, source.size - offset);
      if (bytesRead < 0) {
        if (errno == EINTR) {
          continue;
        }
        const int errorNumber = errno;
        throw FileReaderError(
            FileReaderErrorKind::ReadFailed,
            errorMessage("Bundle file cannot be read", path, errorNumber));
      }
      if (bytesRead == 0) {
        source.size = offset;
        break;
      }
      offset += static_cast<size_t>(bytesRead);
    }
  }

  return source;
}

} // namespace granite::microfrontend::io
