while :; do
    inotifywait -qq -e modify ./public/scripts
    public/scripts/testonce.sh
done
