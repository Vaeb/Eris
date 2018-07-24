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

==mute car lover3 99 minutes liking cars too much
==mute car lov 12 days spamming car pictures
==mute car l 12d minutes will be treated as part of the reason and "days" used as the time format
==mute 152888494165983233 17h
==mute 152888494165983233 99 default mute time
==mute car lover3#0001 general offense, mute time can be auto generated
==mute car