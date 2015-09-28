var sqlBase = require('./baseConnector');
var logger = require('./../../Common/sources/logger');
var utils = require('./../../Common/sources/utils');
var constants = require('./../../Common/sources/constants');

var FileStatus = {
  None: 0,
  Ok: 1,
  WaitQueue: 2,
  NeedParams: 3,
  Convert: 4,
  Err: 5,
  ErrToReload: 6,
  SaveVersion: 7,
  UpdateVersion: 8
};

function TaskResultData() {
  this.key = '';
  this.format = '';
  this.status = FileStatus.None;
  this.statusInfo = constants.NO_ERROR;
  this.lastOpenDate = new Date();
  this.title = '';
}

function getUpsertString(task) {
  var dateNow = sqlBase.getDateTime(new Date());
  var commandArg = [task.key, task.format, task.status, task.statusInfo, dateNow, task.title];
  var commandArgEsc = commandArg.map(function(curVal) {
    return sqlBase.baseConnector.sqlEscape(curVal)
  });
  return 'INSERT INTO task_result ( tr_key, tr_format, tr_status, tr_status_info, tr_last_open_date, tr_title )' +
    ' VALUES (' + commandArgEsc.join(', ') + ')' +
    'ON DUPLICATE KEY UPDATE tr_last_open_date = ' + sqlBase.baseConnector.sqlEscape(dateNow) + ';';
}

function upsert(task) {
  return new Promise(function(resolve, reject) {
    var sqlCommand = getUpsertString(task);
    sqlBase.baseConnector.sqlQuery(sqlCommand, function(error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

function getSelectString(task) {
  return 'SELECT * FROM task_result WHERE tr_key=' + sqlBase.baseConnector.sqlEscape(task.key) + ';';
}

function select(task) {
  return new Promise(function(resolve, reject) {
    var sqlCommand = getSelectString(task);
    sqlBase.baseConnector.sqlQuery(sqlCommand, function(error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}
function toUpdateArray(task, updateTime) {
  var res = [];
  if (task.format) {
    res.push('tr_format=' + sqlBase.baseConnector.sqlEscape(task.format));
  }
  if (task.status) {
    res.push('tr_status=' + sqlBase.baseConnector.sqlEscape(task.status));
  }
  if (task.statusInfo) {
    res.push('tr_status_info=' + sqlBase.baseConnector.sqlEscape(task.status));
  }
  if (updateTime) {
    res.push('tr_last_open_date=' + sqlBase.getDateTime(new Date()));
  }
  if (task.title) {
    res.push('tr_title=' + sqlBase.baseConnector.sqlEscape(task.title));
  }
  return res;
}
function getUpdateString(task) {
  var commandArgEsc = toUpdateArray(task);
  return 'UPDATE task_result SET ' + commandArgEsc.join(', ') +
    ' WHERE tr_key=' + sqlBase.baseConnector.sqlEscape(task.key) + ';';
}

function update(task) {
  return new Promise(function(resolve, reject) {
    var sqlCommand = getUpdateString(task);
    sqlBase.baseConnector.sqlQuery(sqlCommand, function(error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

function getInsertString(task) {
  var dateNow = sqlBase.getDateTime(new Date());
  var commandArg = [task.key, task.format, task.status, task.statusInfo, dateNow, task.title];
  var commandArgEsc = commandArg.map(function(curVal) {
    return sqlBase.baseConnector.sqlEscape(curVal)
  });
  return 'INSERT INTO task_result ( tr_key, tr_format, tr_status, tr_status_info, tr_last_open_date, tr_title )' +
    ' VALUES (' + commandArgEsc.join(', ') + ');';
}
function addRandomKey(task) {
  return new Promise(function(resolve, reject) {
    task.key = task.key + '_' + Math.round(Math.random() * 10000);
    var sqlCommand = getInsertString(task);
    sqlBase.baseConnector.sqlQuery(sqlCommand, function(error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}
function* addRandomKeyTask(key) {
  var task = new TaskResultData();
  task.key = key;
  task.status = FileStatus.WaitQueue;
  while (true) {
    var addRes = yield addRandomKey(task);
    if (addRes.affectedRows > 0) {
      break;
    }
  }
  return task;
}

function getRemoveString(docId) {
  return 'DELETE FROM task_result WHERE tr_key=' + sqlBase.baseConnector.sqlEscape(docId) + ';';
}
function remove(docId) {
  return new Promise(function(resolve, reject) {
    var sqlCommand = getRemoveString(docId);
    sqlBase.baseConnector.sqlQuery(sqlCommand, function(error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}
function getExpiredString(expireSeconds) {
  var expireDate = new Date();
  utils.addSeconds(expireDate, -expireSeconds);
  var expireDateStr = sqlBase.baseConnector.sqlEscape(sqlBase.getDateTime(expireDate));
  return 'SELECT * FROM task_result WHERE tr_last_open_date <= ' + expireDateStr + ';';
}
function getExpired(expireSeconds) {
  return new Promise(function(resolve, reject) {
    var sqlCommand = getExpiredString(expireSeconds);
    sqlBase.baseConnector.sqlQuery(sqlCommand, function(error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

exports.FileStatus = FileStatus;
exports.TaskResultData = TaskResultData;
exports.upsert = upsert;
exports.select = select;
exports.update = update;
exports.addRandomKey = addRandomKey;
exports.addRandomKeyTask = addRandomKeyTask;
exports.remove = remove;
exports.getExpired = getExpired;