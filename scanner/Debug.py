#!/usr/bin/env python2
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


def start():
    """
    Start capturing memory traces for profiler.
    """

    tracemalloc.start()

def take_snapshot():
    """
    Take a memory snapshot for analysis.
    """

    return tracemalloc.take_snapshot()


def display_top(snapshot, key_type='lineno', limit=10, cumulative=False):
    """
    Do a memory usage analysis based on the snapshot given as parameter
    and print it sorted by memory usage.
    See  `tracemalloc` documentation for parameters values.
    """

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
