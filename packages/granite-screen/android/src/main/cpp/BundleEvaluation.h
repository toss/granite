#pragma once

#include <exception>
#include <utility>

namespace granite {

// JSI errors derive from std::exception. Translate them at the JNI boundary
// rather than allowing a JavaScript evaluation failure to escape into native code.
template <typename Evaluate, typename ReportError>
void WithEvaluationErrorHandler(Evaluate&& evaluate, ReportError&& reportError) {
  try {
    std::forward<Evaluate>(evaluate)();
  } catch (const std::exception& error) {
    std::forward<ReportError>(reportError)(error.what());
  }
}

} // namespace granite
