// Reads a fetch() Response as a Server-Sent Events stream, handing each parsed
// event to onEvent(eventName, data).
export const readSseStream = async (response, onEvent) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line. Network chunks do not line up with
    // events, so whatever follows the last blank line is a partial event and
    // stays in the buffer until the rest arrives.
    const rawEvents = buffer.split("\n\n");
    buffer = rawEvents.pop() ?? "";

    for (const raw of rawEvents) {
      let event = "message";
      let data = "";

      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (data) {
        onEvent(event, JSON.parse(data));
      }
    }
  }
};
