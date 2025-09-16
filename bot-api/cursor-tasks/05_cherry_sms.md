Goal: Cherry SMS integration.
Steps:
1) POST /sms/cherry/send: send a templated message to a group_id. Include "Reply STOP to opt out."
2) POST /sms/cherry/webhook: parse inbound STOP/HELP and mark consent state in DB.
3) Add minimal persistence: clients table (id, phone, consent flags, timestamps).
4) Tests: send mocked success; webhook STOP flips consent.