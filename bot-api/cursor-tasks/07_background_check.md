cursor-tasks/07_background_check.md
Goal: Background check placeholder with async completion.
Steps:
1) POST /background/check: accept person payload; enqueue a job; return 202.
2) Worker simulates provider call, writes summarized flags {decision, notes, raw}.
3) Fire webhook event background.completed to LendWizely callback if configured.
Tests: job flow + summary formatting.
