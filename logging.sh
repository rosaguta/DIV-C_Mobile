#!/bin/bash

APP_PACKAGE="com.digitalrose.DIVC_Mobile"  # Replace with your app's package name
LOG_FILE="performance_log.csv"
DURATION=120  # Total duration in seconds
INTERVAL=1    # Interval in seconds

# Write CSV headers
echo "Timestamp,PID,CPU_Usage,Memory_Usage_KB" > $LOG_FILE

echo "Finding process ID for $APP_PACKAGE..."
PID=$(adb shell pidof com.digitalrose.DIVC_Mobile)

if [ -z "$PID" ]; then
    echo "Error: App not running. Start the app and try again."
    exit 1
fi

echo "Logging CPU & RAM usage for PID: $PID (Duration: $DURATION seconds)"

for ((i=0; i<DURATION; i+=INTERVAL)); do
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    
    # Get CPU usage
    CPU_USAGE=$(adb shell top -n 1 -b | grep "$PID" | awk '{print $9}' | tr -d '%')

    # Get RAM usage
    MEM_USAGE=$(adb shell dumpsys meminfo $PID | grep "TOTAL PSS" | awk '{print $3}')

    # Write to log file
    echo "$TIMESTAMP,$PID,$CPU_USAGE,$MEM_USAGE" >> $LOG_FILE

    sleep $INTERVAL
done

echo "Performance logging complete. Data saved to $LOG_FILE."
