#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Tools to debug memory allocation in Scanner
# From https://docs.python.org/3/library/tracemalloc.html
#
# Use with:
# Debug.start()
#
# ... run your application ...
#
# snapshot = Debug.take_snapshot()
# Debug.display_top(snapshot)
#

import linecache
import os
import tracemalloc
import cProfile
import pstats
import io


# The execution profile context. The code is not reintering.
_pr = cProfile.Profile()


def memory_start():
    """
    Start capturing memory traces for profiler.
    """

    tracemalloc.start()


def memory_stop():
    """
    Stop tracing memory and return the memory snapshot for analysis.
    """

    return tracemalloc.take_snapshot()


def memory_dump(snapshot, key_type='lineno', limit=30, cumulative=False):
    """
    Do a memory usage analysis based on the snapshot given as parameter
    and print it sorted by memory usage.
    See  `tracemalloc` documentation for parameters values.
    `limit` is the number of memory traces printed.
    """

    print()
    print()
    print("====== Memory Profile =====")

    snapshot = snapshot.filter_traces((
        tracemalloc.Filter(False, "<frozen importlib._bootstrap>"),
        tracemalloc.Filter(False, "<unknown>"),
    ))
    top_stats = snapshot.statistics(key_type, cumulative)

    print("Top %s lines" % limit)
    for index, stat in enumerate(top_stats[:limit], 1):
        frame = stat.traceback[0]
        # replace "/path/to/module/file.py" with "module/file.py"
        filename = os.sep.join(frame.filename.split(os.sep)[-2:])
        print("#%s: %s:%s: %.1f KiB"
              % (index, filename, frame.lineno, stat.size / 1024))
        line = linecache.getline(frame.filename, frame.lineno).strip()
        if line:
            print('    %s' % line)

    other = top_stats[limit:]
    if other:
        size = sum(stat.size for stat in other)
        print("%s other: %.1f KiB" % (len(other), size / 1024))
    total = sum(stat.size for stat in top_stats)
    print("Total allocated size: %.1f KiB" % (total / 1024))

    print("===========================")


def profile_start():
    """
    Enable execution profiling.
    """

    _pr.enable()


def profile_stop():
    """
    Disable execution profiling.
    """

    _pr.disable()


def profile_dump(limit=30, cumulative=False):
    """
    Print code execution time profile.
    `limit` is the number of execution stacks printed.
    `cumulative` when `True`, profile is by cumulative time in a function
    else sort according to time spent within each function (what functions
    were looping a lot, and taking a lot of time).
    """
    
    print()
    print()
    print("====== Execution Profile =====")

    s = io.StringIO()
    ps = pstats.Stats(_pr, stream=s).sort_stats('cumulative' if cumulative else 'time')
    ps.print_stats(limit)
    print(s.getvalue())

    print("==============================")

