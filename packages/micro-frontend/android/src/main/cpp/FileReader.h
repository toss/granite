#pragma once

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

std::string readFileToMemory(const std::string &path);

}
