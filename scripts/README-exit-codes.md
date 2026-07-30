# Why these scripts set `process.exitCode` instead of calling `process.exit()`

## Symptom

`pnpm verify` failed at random with exit code 139 (SIGSEGV) — roughly one run in
three — *after* every check had already printed its success line. The failing
step moved around between runs: sometimes `check:architecture`, sometimes
`typecheck`, which made it look like a turbo or pnpm problem.

It is neither. It is Node crashing in its own shutdown path.

## Cause

macOS crash report for `node scripts/check-architecture.mjs`:

```
EXC_BAD_ACCESS (SIGSEGV) KERN_INVALID_ADDRESS at 0x48

  libsystem_malloc.dylib   _xzm_free
  node                     std::__hash_table<..., OptionsParser<PerProcessOptions>::OptionInfo>::__deallocate_node(...)
  node                     std::__hash_table<...>::~__hash_table()
  node                     node::options_parser::OptionsParser<node::PerProcessOptions>::~OptionsParser()
  libsystem_c.dylib        __cxa_finalize_ranges
  libsystem_c.dylib        exit
  node                     node::Exit(node::ExitCode)
  node                     node::DefaultProcessExitHandlerInternal(...)
```

`process.exit()` calls C `exit()`, which runs static destructors via
`__cxa_finalize_ranges`. Node's global `OptionsParser` is torn down there and
crashes freeing its hash table against the `xzm` allocator that ships with
current macOS. Nothing in this repository is on the stack.

Observed on Node v24.7.0 (arm64) / Darwin 25.x. Letting the event loop drain
normally does not take that path.

## Measurement

Two scripts differing only in how they finish, 150 runs each:

| ending                  | SIGSEGV |
| ----------------------- | ------- |
| `process.exit(0)`       | 14/150  |
| `process.exitCode = 0`  | 0/150   |

## Rule

In these scripts, report the result, set `process.exitCode`, and let the process
end on its own. The exit status is identical and stdout is flushed properly,
which `process.exit()` does not guarantee anyway.

`process.exit()` is still correct where the script genuinely cannot continue and
has nothing left to drain — `check-licenses.mjs` keeps it for the
"node_modules is missing" abort, and that path is commented.

**Do not** apply this blindly to scripts holding open handles (a `pg` pool, a
Playwright browser, an HTTP server). There, setting `exitCode` without closing
the handle turns a rare crash into a permanent hang, which is worse. Close the
resource first, then let the loop drain.

## Note on CI

CI pins Node via `.nvmrc` (22), so this mostly bites local machines running a
newer Node — including the `.githooks/pre-push` hook, which runs `pnpm verify`
and would fail a push for no reason.
