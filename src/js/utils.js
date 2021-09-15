"use strict";

const Regex = Object.freeze({
  CONNECTION_REACTION: /(like(s)?|celebrate(s)?|support(s)?|love(s)?|find(s)?|reacted to|curious about) this/i,
  CONNECTION_COMMENT: /commented on this/i,
  CONNECTION_WORK_ANNIVERSARY: /work anniversary/i,
  CONNECTION_JOB_UPDATE: /job update/i,
  FOLLOWEE_POST: /(following|followers)/i,
  FOLLOWEE_MEMBER_POST: /following/i,
  FOLLOWEE_COMPANY_POST: /followers/i,
  GROUP_POST: /new post in/i,
  PROMOTED_POST: /promoted/i,
  JOB_RECOMMENDATION: /jobs recommended for you/i,
});

const ActivityType = Object.freeze({
  CONNECTION_POST: "connection_post",
  CONNECTION_SHARE: "connection_share",
  CONNECTION_COMMENT: "connection_comment",
  CONNECTION_REACTION: "connection_reaction",
  CONNECTION_WORK_ANNIVERSARY: "connection_work_anniversary",
  CONNECTION_JOB_UPDATE: "connection_job_update",
  FOLLOWEE_POST: "followee_post",
  FOLLOWEE_COMMENT: "followee_comment",
  GROUP_POST: "group_post",
  PROMOTED_POST: "promoted_post",
  JOB_RECOMMENDATION: "job_recommendation",
  UNKNOWN: "unknown"
});

const ActivitySelector = Object.freeze({
  HEADER: ".feed-shared-header",
  NESTED_ACTIVITY: ".feed-shared-mini-update-v2",
  ACTOR: "[data-urn^='urn:li:activity'] > div > .feed-shared-actor",
  ACTOR_WITH_CTRL_MENU: ".feed-shared-actor--with-control-menu",
  COMMENTER: ".comments-comment-item__post-meta",
});

/**
 * Determines whether a feed activity has a nested feed activity.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function hasNestedPost(activity) {
  return activity.querySelector(ActivitySelector.NESTED_ACTIVITY) !== null;
}

/**
 * Determines whether a feed activity has a header panel.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function hasHeader(activity) {
  return activity.querySelector(ActivitySelector.HEADER) !== null;
}

/**
 * Determines whether a feed activity has an author panel with
 * control menu.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function hasActorWithControlMenu(activity) {
  return activity.querySelector(ActivitySelector.ACTOR_WITH_CTRL_MENU) !== null;
}

/**
 * Determines whether the text of commenter section within a
 * feed activity matches a regular expression object.
 *
 * @param {Element} activity - An element of feed activity.
 * @param {string} regexp - A regular expression object.
 * @returns {boolean}
 */
function doesCommenterMatch(activity, regexp) {
  let comment = activity.querySelector(ActivitySelector.COMMENTER);
  if (comment === null) {
    return false;
  }

  return comment.innerHTML.match(regexp) !== null;
}

/**
 * Determines whether the text of header panel within a feed
 * activity matches a regular expression object.
 *
 * @param {Element} activity - An element of feed activity.
 * @param {string} regexp - A regular expression object.
 * @returns {boolean}
 */
function doesHeaderMatches(activity, regexp) {
  let header = activity.querySelector(ActivitySelector.HEADER);
  if (header === null) {
    return false;
  }

  return header.innerHTML.match(regexp) !== null;
}

/**
 * Determines whether the text of an actor panel within a feed
 * activity matches a regular expression object.
 *
 * @param {Element} activity - An element of feed activity.
 * @param {string} regexp - A regular expression object.
 * @returns {boolean}
 */
function doesActorMatch(activity, regexp) {
  let actor = activity.querySelector(ActivitySelector.ACTOR);
  if (actor === null) {
    return false;
  }

  return actor.innerHTML.match(regexp) !== null;
}

/**
 * Determines whether a feed activity is of type reaction
 * activity.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isReaction(activity) {
  return doesHeaderMatches(activity, Regex.CONNECTION_REACTION);
}

/**
 * Determines whether a feed activity is of type comment from
 * a connection only.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isConnectionComment(activity) {
  return doesHeaderMatches(activity, Regex.CONNECTION_COMMENT)
      && !(
          doesCommenterMatch(activity, Regex.FOLLOWEE_POST)
          || doesActorMatch(activity, Regex.FOLLOWEE_MEMBER_POST)
      );
}

/**
 * Determines whether a feed activity is of type comment from
 * a followee only.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isFolloweeComment(activity) {
  return doesHeaderMatches(activity, Regex.CONNECTION_COMMENT)
      && (
          doesCommenterMatch(activity, Regex.FOLLOWEE_POST)
          || doesActorMatch(activity, Regex.FOLLOWEE_MEMBER_POST)
      );
}

/**
 * Determines whether a feed activity is of type post from
 * a connection only.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isConnectionPost(activity) {
  return hasActorWithControlMenu(activity)
      && !(
          isFolloweePost(activity)
          || isPromotedPost(activity)
          || isGroupPost(activity)
          || isSharedPost(activity)
      );
}

/**
 * Determines whether a feed activity is of type post from
 * a followee only.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isFolloweePost(activity) {
  return hasActorWithControlMenu(activity)
      && doesActorMatch(activity, Regex.FOLLOWEE_POST)
      && !isPromotedPost(activity);
}

/**
 * Determines whether a feed activity is of type post from
 * a group only.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isGroupPost(activity) {
  return doesHeaderMatches(activity, Regex.GROUP_POST);
}

/**
 * Determines whether a feed activity is of type promotional
 * post.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isPromotedPost(activity) {
  return doesActorMatch(activity, Regex.PROMOTED_POST);
}

/**
 * Determines whether a feed activity is of type shared post.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isSharedPost(activity) {
  return hasActorWithControlMenu(activity)
      && hasNestedPost(activity)
      && !hasHeader(activity);
}

/**
 * Determines whether a feed activity is of type work anniversary.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isWorkAnniversary(activity) {
  return doesHeaderMatches(activity, Regex.CONNECTION_WORK_ANNIVERSARY);
}

/**
 * Determines whether a feed activity is of type job update
 * of a connection.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isJobUpdate(activity) {
  return doesHeaderMatches(activity, Regex.CONNECTION_JOB_UPDATE);
}

/**
 * Determines whether a feed activity is of type job recommendation.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {boolean}
 */
function isJobRecommendation(activity) {
  return doesHeaderMatches(activity, Regex.JOB_RECOMMENDATION);
}

/**
 * Determines the type of a feed activity.
 *
 * @param {Element} activity - An element of feed activity.
 * @returns {string} - A string identifies an activity type.
 */
function inferActivityType(activity) {
  if (isConnectionPost(activity)) {
    return ActivityType.CONNECTION_POST;
  } else if (isSharedPost(activity)) {
    return ActivityType.CONNECTION_SHARE;
  } else if (isConnectionComment(activity)) {
    return ActivityType.CONNECTION_COMMENT;
  } else if (isReaction(activity)) {
    return ActivityType.CONNECTION_REACTION;
  } else if (isWorkAnniversary(activity)) {
    return ActivityType.CONNECTION_WORK_ANNIVERSARY;
  } else if (isJobUpdate(activity)) {
    return ActivityType.CONNECTION_JOB_UPDATE;
  } else if (isFolloweePost(activity)) {
    return ActivityType.FOLLOWEE_POST;
  } else if (isFolloweeComment(activity)) {
    return ActivityType.FOLLOWEE_COMMENT;
  } else if (isGroupPost(activity)) {
    return ActivityType.GROUP_POST;
  } else if (isPromotedPost(activity)) {
    return ActivityType.PROMOTED_POST;
  } else if (isJobRecommendation(activity)) {
    return ActivityType.JOB_RECOMMENDATION;
  } else {
    return ActivityType.UNKNOWN;
  }
}

/**
 * Await until an element exists in the DOM.
 *
 * @see https://stackoverflow.com/q/16149431/5631308
 * @param {string} selector - A CSS selector to match against document.
 * @returns {Element} - An element matching the selector.
 */
async function untilElementExists(selector) {
  while (!document.querySelector(selector)) {
    await new Promise(it => setTimeout(it, 50));
  }

  return document.querySelector(selector);
}

/**
 * Execute a callback function when browser address bar changes.
 *
 * @see https://stackoverflow.com/q/1930927/5631308
 * @param {function} callback - A callback function with {@link window.location} parameter.
 * @returns {number} - A number identifies the timer created by the call to setInterval().
 *                     This value can be passed to clearInterval() to cancel the interval.
 */
function onAddressBarChanges(callback) {
  let href = window.location.href;
  return setInterval(function () {
    if (href !== window.location.href) {
      href = window.location.href;
      callback(window.location);
    }
  }, 50);
}