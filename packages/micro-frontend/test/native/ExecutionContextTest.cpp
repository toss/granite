#include <hermes/hermes.h>
#include <granite/ExecutionContext.h>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <unordered_set>

int main(int argc, char** argv) {
  try {
    if (argc != 2) return 2;
    {
      auto early = facebook::hermes::makeHermesRuntime();
      granite::execution::installRuntimeIdentity(*early, "root");
      auto evaluateEarly = [&](const std::string& source) {
        try {
          return early->evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(source), "early-callback.js");
        } catch (const facebook::jsi::JSError& error) {
          throw std::runtime_error(error.what());
        }
      };
      evaluateEarly("globalThis.__MICRO_FRONTEND__ = {}; globalThis.calls = 0;");
      auto listener = evaluateEarly("(function(owner) { calls++; return this.label + ':' + owner; })")
          .asObject(*early).asFunction(*early);
      auto binder = granite::execution::callbackBinderWithOwnership(
          *early, granite::execution::bootstrapCallbackBinder(*early, "root"),
          [](facebook::jsi::Runtime& runtime, const facebook::jsi::Value* args, size_t)
              -> std::optional<granite::execution::CallbackOwnership> {
            auto id = args[0].asString(runtime).utf8(runtime);
            return granite::execution::CallbackOwnership{id, id != "closed"};
          });
      early->global().setProperty(*early, "earlyOwned", binder.call(*early, listener));
      evaluateEarly(R"JS(
        if (earlyOwned.call({label:'receiver'}, 'root') !== 'receiver:root') throw new Error('early root lost');
        var rejected = false;
        try { earlyOwned('service'); } catch(error) { rejected = true; }
        if (!rejected || calls !== 1) throw new Error('service borrowed root');
        if (earlyOwned('closed') !== undefined || calls !== 1) throw new Error('closed bootstrap delivered');
        __MICRO_FRONTEND__.microFrontendExecutionContext = null;
        rejected = false;
        try { earlyOwned('root'); } catch(error) { rejected = true; }
        if (!rejected || calls !== 1) throw new Error('malformed context bypassed');
      )JS");
    }
    auto runtime = facebook::hermes::makeHermesRuntime();
    auto evaluate = [&](const std::string& source) {
      return runtime->evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(source), "execution-contract.js");
    };
    auto callback = evaluate("(function(value) { return this.label + ':' + value + ':' + (globalThis.getExecutionContext ? String(getExecutionContext().capture()?.id ?? null) : 'early'); })")
        .asObject(*runtime).asFunction(*runtime);
    auto throwing = evaluate("(function() { throw new Error('callback-error'); })").asObject(*runtime).asFunction(*runtime);
    runtime->global().setProperty(*runtime, "unowned", granite::execution::unownedCallbackBinder(*runtime).call(*runtime, callback));
    runtime->global().setProperty(*runtime, "throwing", granite::execution::unownedCallbackBinder(*runtime).call(*runtime, throwing));
    evaluate("if (unowned.call({label:'receiver'}, 7) !== 'receiver:7:early') throw new Error('early callback failed');");
    std::ifstream input(argv[1]);
    std::stringstream contents; contents << input.rdbuf();
    if (contents.str().empty()) return 3;
    evaluate(contents.str());
    evaluate(R"JS(
      var context = getExecutionContext();
      context.run({id:'activity'}, function() {
        if (unowned.call({label:'receiver'}, 8) !== 'receiver:8:null') throw new Error('borrowed caller ownership');
        if (context.capture().id !== 'activity') throw new Error('caller was not restored');
        var caught = false;
        try { throwing(); } catch(error) { caught = true; if (error.message !== 'callback-error') throw error; }
        if (!caught) throw new Error('callback exception was swallowed');
        if (context.capture().id !== 'activity') throw new Error('exception leaked ownership');
      });
      if (context.capture() !== null) throw new Error('outer context leaked');
    )JS");
    granite::execution::installRuntimeIdentity(*runtime, "runtime");
    auto active = std::make_shared<std::unordered_set<std::string>>(std::initializer_list<std::string>{"a", "b"});
    auto ownedBinder = granite::execution::callbackBinderWithOwnership(
        *runtime, granite::execution::capture(*runtime).callbackBinder(*runtime),
        [active](facebook::jsi::Runtime& runtime, const facebook::jsi::Value* args, size_t count)
            -> std::optional<granite::execution::CallbackOwnership> {
          if (count == 0 || !args[0].isObject()) return std::nullopt;
          auto owner = args[0].asObject(runtime).getProperty(runtime, "owner");
          if (owner.isUndefined()) return std::nullopt;
          auto id = owner.asString(runtime).utf8(runtime);
          return granite::execution::CallbackOwnership{id, active->count(id) != 0};
        });
    auto listener = evaluate(R"JS((function(event) {
      var id = getExecutionContext().capture().id;
      globalThis.deliveries = (globalThis.deliveries || 0) + 1;
      if (event.fail) throw new Error('owned-failure');
      if (event.nested) {
        if (owned.call({label:'inner'}, {owner:'b', value:2}) !== 'b:inner:2') throw new Error('nested owner');
        if (getExecutionContext().capture().id !== id) throw new Error('nested restore');
      }
      return id + ':' + this.label + ':' + event.value;
    }))JS").asObject(*runtime).asFunction(*runtime);
    runtime->global().setProperty(*runtime, "owned", ownedBinder.call(*runtime, listener));
    evaluate(R"JS(
      context.run({id:'b'}, function() {
        if (owned.call({label:'outer'}, {owner:'a', value:1, nested:true}) !== 'a:outer:1') throw new Error('producer lost');
        if (context.capture().id !== 'b') throw new Error('caller leaked');
        if (owned.call({label:'fallback'}, {value:3}) !== 'runtime:fallback:3') throw new Error('captured owner lost');
        var caught = false;
        try { owned({owner:'a', fail:true}); } catch(error) { caught = error.message === 'owned-failure'; }
        if (!caught || context.capture().id !== 'b') throw new Error('exception restore failed');
      });
      if (context.capture().id !== 'runtime') throw new Error('root restore failed');
      globalThis.beforeClose = deliveries;
    )JS");
    active->erase("a");
    evaluate(R"JS(
      if (owned({owner:'a', value:4}) !== undefined || deliveries !== beforeClose) throw new Error('closed delivery accepted');
      if (owned.call({label:'live'}, {owner:'b', value:5}) !== 'b:live:5') throw new Error('other owner affected');
    )JS");
    std::cout << "{\"runtime\":\"Hermes\",\"earlyRootCallbackChecks\":4,\"bootstrapCallbackChecks\":4,\"producerCallbackChecks\":7,\"passed\":true}" << std::endl;
  } catch (const std::exception& error) {
    std::cerr << error.what() << std::endl;
    return 1;
  }
}
