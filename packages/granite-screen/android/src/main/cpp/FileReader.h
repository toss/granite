#ifndef GRANITE_IO_FILE_READER_H_
#define GRANITE_IO_FILE_READER_H_

#include <string>
#include <stdexcept>

namespace granite {
namespace io {

// RAII guard for POSIX file descriptors.
// Closes the fd on destruction. Non-copyable, non-movable (stack-local usage only).
struct FdGuard {
  int fd;
  explicit FdGuard(int f) : fd(f) {}
  ~FdGuard();
  FdGuard(const FdGuard&) = delete;
  FdGuard& operator=(const FdGuard&) = delete;
};

// Classification of file-reading errors.
enum class ErrorKind {
  kNotFound,          // open() failed (ENOENT, EACCES, etc.)
  kStatFailed,        // fstat() failed
  kAllocationFailed,  // std::bad_alloc during buffer allocation
  kReadFailed         // read() failed
};

// Error thrown by readFileToString() with a machine-readable ErrorKind
// and the originating errno value.
class FileReaderError : public std::runtime_error {
 public:
  FileReaderError(ErrorKind kind, const std::string& message,
                  int errno_value = 0);

  ErrorKind kind() const { return kind_; }
  int errno_value() const { return errno_value_; }

 private:
  ErrorKind kind_;
  int errno_value_;
};

// Reads the entire contents of |path| into a std::string.
//
// Returns an empty string for zero-byte files (callers decide whether
// that is an error — e.g., BundleEvaluator treats it as IOException).
//
// Throws FileReaderError on failure:
//   kNotFound          — open() failed
//   kStatFailed        — fstat() failed
//   kAllocationFailed  — could not allocate buffer
//   kReadFailed        — read() failed (after EINTR retries)
std::string ReadFileToString(const std::string& path);

}  // namespace io
}  // namespace granite

#endif  // GRANITE_IO_FILE_READER_H_
