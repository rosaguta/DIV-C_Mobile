#!/bin/bash

APP_PACKAGE="com.digitalrose.DIVC_Mobile"  # Replace with your app's package name
LOG_FILE="ram_usage_log.csv"
DURATION=120   # Total duration in seconds
INTERVAL=1    # Interval in seconds

echo "Timestamp,PID,Memory_Usage_KB" > $LOG_FILE

echo "Finding process ID for $APP_PACKAGE..."
PID=$(adb shell pidof com.digitalrose.DIVC_Mobile)

if [ -z "$PID" ]; then
    echo "Error: App not running. Start the app and try again."
    exit 1
fi

echo "Logging RAM usage for PID: $PID (Duration: $DURATION seconds)"

for ((i=0; i<DURATION; i+=INTERVAL)); do
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    MEM_USAGE=$(adb shell dumpsys meminfo $PID | grep "TOTAL PSS" | awk '{print $3}')

    echo "$TIMESTAMP,$PID,$MEM_USAGE" >> $LOG_FILE
    sleep $INTERVAL
done

echo "RAM logging complete. Data saved to $LOG_FILE."
