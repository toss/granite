#pragma once

#include <cstddef>
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>

namespace granite::microfrontend::io {

enum class FileReaderErrorKind {
  NotFound,
  StatFailed,
  AllocationFailed,
  ReadFailed,
};

class FileReaderError : public std::runtime_error {
public:
  FileReaderError(FileReaderErrorKind kind, const std::string &message);

  FileReaderErrorKind kind() const;

private:
  FileReaderErrorKind kind_;
};

struct FileBytes {
  std::unique_ptr<uint8_t[]> data;
  size_t size;
};

// Owns a snapshot independently of subsequent file mutation, replacement, or
// deletion.
FileBytes readFileToMemory(const std::string &path);

} // namespace granite::microfrontend::io
