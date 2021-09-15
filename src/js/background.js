/*
 * Listens for messages from the content script (content.js).
 *
 * Content scripts can't directly use WebExtension storage
 * APIs, they must communicate with the extension's background
 * scripts, to indirectly access all the same APIs that the
 * background scripts can.
 *
 * See https://tinyurl.com/communicating-with-bg-script.
 */
browser.runtime.onMessage.addListener(async (message) => {

  switch (message.type) {
    case "load_filters":
      let data = await browser.storage.sync.get({ filters: "[]" });
      let deserialized = JSON.parse(data.filters);
      return Promise.resolve(deserialized);

    case "store_filters":
      let serialized = JSON.stringify(message.data);
      return await browser.storage.sync.set({ filters: serialized });
  }
});
