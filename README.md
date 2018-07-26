# Niimp-Now
Discord bot with an advanced argument parsing and parameter setup system.

# Example Usage
- ==mute
    - user:
        - Types: [UserId, Username, UsernamePartial, Username#0000]
    - time:
        - Types: [Number, [Number, TimeFormatSmall]]
        - Optional: true
        - Overflows: [1]
    - timeFormat:
        - Types: [TimeFormat, TimeFormatSmall]
        - Optional: true
        - Requires: [Time]
    - reason:
        - Types: [Text]
        - Optional: true

---

- ==mute car lover3 99 minutes liking cars too much
    - user: car lover3
    - time: 99
    - timeFormat: minutes
    - reason: liking cars too much
- ==mute car lov 12 days spamming car pictures
    - user: car lov
    - time: 12
    - timeFormat: [resolved-default] minutes
    - reason: spamming car pictures
- ==mute car l 12d minutes will be treated as part of the reason and "days" used as the time format
    - user: car l
    - time: 12
    - timeFormat: days
    - reason: minutes will be treated as part of the reason and "days" used as the time format
- ==mute 152888494165983233 17h
    - user: 152888494165983233
    - time: 17
    - timeFormat: hours
    - reason: [resolved-default] Reason not provided
- ==mute 152888494165983233 99 will use default mute timeFormat
    - user: 152888494165983233
    - time: 99
    - timeFormat: [resolved-default] minutes
    - reason: will use default mute timeFormat
- ==mute car lover3#0001 general offense, mute time can be auto generated
    - user: car lover3#0001
    - time: [resolved-default] 10
    - timeFormat: [resolved-default] minutes
    - reason: general offense, mute time can be auto generated
- ==mute car
    - user: car
    - time: [resolved-default] 10
    - timeFormat: [resolved-default] minutes
    - reason: [resolved-default] Reason not provided