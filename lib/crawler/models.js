'use strict';

let root = require('window-or-global');

let Hooks = require('../../public/hooks').Hooks;
let hooks = new Hooks();

const _ = require('../common/helper');

/** Crawling Node: each of the tree node represents a unique user page  */
function NSAppCrawlingTreeNode() {
  this.path = ''; //  Unique path which leads to current page
  this.parent = null; //  Parent ui element
  this.type = 'normal'; //  'tab'/ 'normal'
  this.depth = 0;
  this.actions = []; // Units in {value : NSAppCrawlingTreeNodeAction}
  this.digest = null;
  this.reportSuite = null;
}

function NSAppCrawlingTreeNodeAction() {
  this.isTriggered = false;
  this.location = null;
  this.input = null;
  this.source = {};
}

NSAppCrawlingTreeNode.prototype.isFinishedBrowseing = function() {
  let isFinished = true;
  for (let key in this.actions) {
    if (this.actions[key].isTriggered === false) {
      isFinished = false;
      break;
    }
  }
  return isFinished;
};

NSAppCrawlingTreeNode.prototype.checkDigest = function(platform, source) {
  if (this.digest == null) {
    if (hooks.checkDigest(platform, source, this)) {
      return new Promise((resolve) => {
        resolve(this.digest);
      });
    } else {
      if (platform === 'iOS') {
        return root.wdclient.send('/wd/hub/session/' + root.wdclient.sessionId + '/title', 'get', null, null)
          .then(title => {
            this.digest = title.value;
          });
      } else if (platform === 'PC-Web') {
        return root.wdclient.send('/wd/hub/session/' + root.wdclient.sessionId + '/url', 'get', null, null)
          .then(title => {
            this.digest = title.value;
            this.url = this.digest;
          });
      } else {
        return root.wdclient.send('/wd/hub/session/' + root.wdclient.sessionId + '/title', 'get', null, null)
          .then(title => {
            this.digest = (source.value.match(/node/g) || []).length + '_' +
              (source.value.match(/android/g) || []).length + '_' +
              (source.value.match(/TextView/g) || []).length + '_' +
              (source.value.match(/EditText/g) || []).length + '_' +
              (source.value.match(/Layout/g) || []).length + '_' +
              (source.value.match(/Button/g) || []).length + '_' +
              title.value;
          });
      }
    }
  } else {
    return new Promise((resolve) => {
      resolve(this.digest);
    });
  }
};

NSAppCrawlingTreeNode.prototype.updateReportData = function(crawler) {
  // empty case
  if (!this.reportSuite) {
    if (!this.parent) {
      this.reportSuite = root.mockData.suites;
      this.reportSuite.uuid = `${_.uuid()}`;
    } else {
      this.reportSuite = {
        'title': this.digest,
        'ctx': {},
        'suites': [],
        'tests': [],
        'pending': [],
        'root': false,
        '_timeout': 10000,
        '_enableTimeouts': true,
        '_slow': 75,
        '_retries': 0,
        'delayed': false,
        '_eventsCount': 1,
        'uuid': `${_.uuid()}`,
        'passes': [],
        'failures': [],
        'skipped': [],
        'totalTests': 0,
        'totalPasses': 0,
        'totalFailures': 0,
        'totalPending': 0,
        'totalSkipped': 0,
        'duration': 0,
        '_totalTime': 0
      };

      this.reportSuite.root = false;
      this.parent.reportSuite.suites.push(this.reportSuite);
    }
  }

  // update total actions
  if (!this.reportSuite.tests.length) {
    this.reportSuite.totalPasses = 0;
    this.reportSuite.totalTests = 0;

    for (let i = 0; i < this.actions.length; i++) {
      this.reportSuite.tests.push({
        'title': this.digest,
        'fullTitle': this.digest,
        'duration': 10000,
        'state': 'passed',
        'pass': true,
        'fail': false,
        'pending': false,
        'context': `./${this.fileName}`,
        'code': this.actions[i].location,
        'skipped': false
      });

      this.reportSuite.totalPasses++;
      this.reportSuite.totalTests++;
      root.mockData.stats.tests++;
    }

    this.reportSuite.passes = this.reportSuite.tests;
  }

  root.mockData.stats.suites = crawler.crawlingBuffer.length;
};

exports.NSAppCrawlingTreeNodeAction = NSAppCrawlingTreeNodeAction;
exports.NSAppCrawlingTreeNode = NSAppCrawlingTreeNode;
