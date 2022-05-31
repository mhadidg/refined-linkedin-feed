let onActiveMode = false;
let scrollEventInterval;
let infiniteScrollObserver;

const Selector = Object.freeze({
  SIDEBAR_CONTAINER: '.scaffold-layout__aside',
  FEED_CONTAINER: '.scaffold-layout__main',
  FEED_ACTIVITY: "[data-urn^='urn:li:activity']",
  FILTER_PANEL: '#filter-panel',
  FILTER_PANEL_CHECKBOXES: 'input.filter[type=checkbox]',
  FILTER_PANEL_APPLY_BTN: '#apply_filters',
});

/**
 * Activate the extension when user access "linkedin.com/feed"
 * directly via browser address bar.
 *
 * Note that this content script will not get executed when the user
 * navigates to the feed via navbar. See the comment below for more details.
 */
if (window.location.pathname === '/feed/') {
  activate();
}

/**
 * Activate the extension when user navigate back to the feed from a
 * different page.
 *
 * Navigation via navbar (or any other navigation means except address
 * bar) in LinkedIn would dynamically load and replace HTML contents
 * instead of fetching a webpage.
 *
 * See https://css-tricks.com/dynamic-page-replacing-content
 */
onAddressBarChanges((location) => {
  if (location.pathname === '/feed/') {
    activate();
  } else if (onActiveMode) {
    deactivate();
  }
});

/** Inject filter panel and apply user preferences to newsfeed. */
async function activate() {
  debug('Entered active mode.');

  let filterPanel = document.createElement('div');
  let file = await fetch(browser.runtime.getURL('html/panel.html'));
  filterPanel.innerHTML = await file.text();

  debug('Awaiting for sidebar container element to exists.');
  await untilElementExists(Selector.SIDEBAR_CONTAINER);
  let sidebarContainer = document.querySelector(Selector.SIDEBAR_CONTAINER);
  sidebarContainer.insertBefore(filterPanel, sidebarContainer.firstChild);

  /**
   * This is a list of activity types that should be removed from the
   * user feed. When storing user preferences, only excluded activity
   * types (those with unchecked checkboxes) are stored.
   */
  let filters = await browser.runtime.sendMessage({ type: 'load_filters' });
  debug(`Excluded activity types: ${filters}.`);

  /**
   * By default, all checkboxes in filter panel template are checked
   * This snippet will apply user preferences by unchecking excluded
   * activity types.
   *
   * See html/panel.html
   */
  for (let activityType of filters) {
    document.getElementById(activityType).removeAttribute('checked');
  }

  infiniteScrollObserver = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      let target = mutation.target;

      if (
        target.nodeType === Node.ELEMENT_NODE &&
        mutation.type === 'childList' &&
        mutation.addedNodes.length === 1 &&
        mutation.addedNodes[0].nodeType === Node.ELEMENT_NODE &&
        mutation.addedNodes[0].getAttribute('data-urn') !== null &&
        mutation.addedNodes[0]
          .getAttribute('data-urn')
          .includes('urn:li:activity')
      ) {
        let activity = mutation.addedNodes[0];
        let activityType = inferActivityType(activity);

        if (filters.includes(activityType)) {
          activity.style.display = 'none';
          // activity.remove();
        } else if (activityType === ActivityType.UNKNOWN) {
          let activityId = activity.getAttribute('data-urn');
          debug(`Encountered unknown feed activity: ${activityId}`);
        }
      }
    }
  });

  debug('Awaiting for feed container element to exists.');
  await untilElementExists(Selector.FEED_CONTAINER);
  let feedContainer = document.querySelector(Selector.FEED_CONTAINER);

  /*
   * Apply user preference filters to activities loaded dynamically
   * via infinite scroll.
   */
  infiniteScrollObserver.observe(feedContainer, {
    childList: true,
    subtree: true,
  });
  debug('Enabled infinite scrolling observer.');

  /*
   * Apply user preference filters to activities provided statically
   * with the HTML page.
   */
  let activities = feedContainer.querySelectorAll(Selector.FEED_ACTIVITY);
  for (let activity of activities) {
    if (filters.includes(inferActivityType(activity))) {
      activity.remove();
    }
  }

  document.querySelector(Selector.FILTER_PANEL_APPLY_BTN).onclick =
    async () => {
      /*
       * When storing user preferences, only excluded activity types
       * (those with unchecked checkboxes) are stored.
       */
      let filters = Array.from(
        document.querySelectorAll(Selector.FILTER_PANEL_CHECKBOXES),
      )
        .filter((element) => !element.checked)
        .map((element) => element.id);

      browser.runtime.sendMessage({ type: 'store_filters', data: filters });

      location.reload();
    };

  /**
   * Emits fake scroll events when the end of the browser window is
   * about to be reached.
   *
   * This is needed because, sometimes, when activities are fetched
   * dynamically via infinite scroll, and the filters are too
   * aggressive, all newly fetched activities will be removed. Yet,
   * the infinite scroll loader requires more scroll events to fetch
   * new activities.
   *
   * TODO use Intersection Observer instead to reduce the overhead.
   */
  scrollEventInterval = setInterval(() => {
    if (
      document.body.offsetHeight - (window.innerHeight + window.pageYOffset) <=
      975
    ) {
      window.dispatchEvent(new Event('scroll'));
    }
  }, 100);
  debug('Enabled fake scroll events generator.');

  onActiveMode = true;
}

function deactivate() {
  debug('Entered inactive mode.');

  clearInterval(scrollEventInterval);
  debug('Disabled fake scroll event generator.');

  infiniteScrollObserver.disconnect();
  debug('Disabled infinite scrolling observer.');

  onActiveMode = false;
}

function debug(message) {
  console.debug(`LinkedInFilterExtension - ${message}`);
}
