import Pusher from "pusher-js";

let pusher;
export function getPusher() {
  if (!pusher) {
    const key = import.meta.env.VITE_PUSHER_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!key) {
      // No key configured - return a minimal mock that won't throw
      pusher = {
        subscribe: () => ({
          bind: () => {},
          unbind: () => {},
        }),
        unsubscribe: () => {},
      };
      return pusher;
    }

    pusher = new Pusher(key, {
      cluster: cluster || undefined,
      forceTLS: true,
    });
  }
  return pusher;
}

export function subscribeTo(channelName, eventName, cb) {
  const ch = getPusher().subscribe(channelName);
  if (!ch) return () => {};
  ch.bind(eventName, cb);
  return () => {
    try {
      ch.unbind(eventName, cb);
    } catch (e) {
      // ignore
    }
    try {
      getPusher().unsubscribe(channelName);
    } catch (e) {
      // ignore
    }
  };
}

export function unsubscribe(channelName) {
  try {
    getPusher().unsubscribe(channelName);
  } catch (e) {
    // ignore
  }
}
