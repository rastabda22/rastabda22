# Memory debugging

The config option `debug_memory` enable a memory debugger in the scanner. However, it works only with Python 3.4+.

When the `debug_memory` option is enabled, after scanner execution, the 30 largest data structures will be printed with their memory size and where (the module line number) where they were allocated, sorted by decreasing memory size.

There is also a `debug_profile` option to enable the runtime execution profiler (this is a bit redundant with the present execution logs but it is more precise).

The memory debugger reports that the memory is mainly used by the `Geonames` data structure.

You can look at https://docs.python.org/3/library/tracemalloc.html for more information or if you want to change the options that have been set.
