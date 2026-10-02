#include "BundleEvaluation.h"
#include <gtest/gtest.h>
#include <stdexcept>
#include <string>

TEST(BundleEvaluation, SuccessfulEvaluationDoesNotReportAnError) {
  int calls = 0;
  granite::WithEvaluationErrorHandler(
      [&] { ++calls; }, [](const char*) { FAIL() << "Unexpected error"; });
  EXPECT_EQ(calls, 1);
}

TEST(BundleEvaluation, ReportsEvaluationExceptionWithoutLosingTheMessage) {
  std::string message;
  granite::WithEvaluationErrorHandler(
      [] { throw std::runtime_error("ReferenceError: missing value"); },
      [&](const char* error) { message = error; });
  EXPECT_EQ(message, "ReferenceError: missing value");
}

TEST(BundleEvaluation, DoesNotSwallowTheJavaExceptionTranslator) {
  EXPECT_THROW(
      granite::WithEvaluationErrorHandler(
          [] { throw std::runtime_error("evaluation failed"); },
          [](const char*) { throw std::logic_error("translated exception"); }),
      std::logic_error);
}
