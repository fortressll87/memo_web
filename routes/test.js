var express = require('express');
var router = express.Router();
var perPage = 5;
var url = require('url');
var async = require('async');
var ObjectID = require('mongodb').ObjectID;

//select all
router.post('/selectType', function (req, res) {
    var mysqlConn = req.mysqlConn;
    var dataType = req.body.dataType
        //var query = "select * from stopwords where name like concat('%', '" + dataType + "', '%')"
    var query = "select type from chartExample";
    console.log("/route.post /selectType ");
    var query = mysqlConn.query(query, function (err, rows) {
        // console.log(rows);
        res.jsonp({
            "rows": rows
        });
    });
    console.log(query);
});

router.post('/testDetail', function (req, res) {
    var db = req.db;
    var mysqlConn = req.mysqlConn;
    
    var model_id = mysqlConn.escape(req.body.model_id);
    var job_id = mysqlConn.escape(req.body.job_id);
    var cur_page = mysqlConn.escape(req.body.cur_page) * 1;
    var per_page = mysqlConn.escape(req.body.per_page) * 1;
    
    async.parallel([
        function (callback) {
            var query = "";
            query += "SELECT mtr.model_id, mtr.result, cm.job_id, cm.url, cm.na_yn ";
            query += "FROM modelTestResult mtr, contentsMaster cm ";
            query += "WHERE mtr.contents_id = cm.contents_id AND mtr.model_id = '" + model_id + "' AND job_id = '" + job_id + "' ";
            query += "ORDER BY cm.url ";
            query += "LIMIT " + per_page + " OFFSET " + ((cur_page - 1) * per_page) + " ";
            
            mysqlConn.query(query, function (err, detailDo) {
                callback(null, detailDo);
            });
            
        }
        , function (callback) {
            var query = "";
            query += "SELECT count(*) as cnt ";
            query += "FROM modelTestResult mtr, contentsMaster cm ";
            query += "WHERE mtr.contents_id = cm.contents_id AND mtr.model_id = 1 AND job_id = 1 ";
            
            mysqlConn.query(query, function (err, cnt) {
                callback(null, cnt);
            });
            
        }
    ], function (err, results) {
        res.jsonp({
            "cnt": results[1]
            , 'detailDo': results[0]
        });
        
    });

});

router.post('/initGraph', function (req, res) {
    //var dataType = req.body.dataType;
    var db = req.db;
    var mysqlConn = req.mysqlConn;
    
    async.parallel([
        function (callback) {
            var query = "";
            query += "SELECT mm.model_id, mm.model_path, mm.model_desc, ";
            query += "cm.job_id, jm.job_name, COUNT(*) AS total_cnt, ";
            query += "(COUNT(*) - SUM(mtr.result)) AS result_sum, ";
            query += "(100 - ROUND(SUM(mtr.result) / COUNT(*) * 100)) AS pct, ";
            query += "ROUND(SUM(mtr.result) / COUNT(*) * 100) AS negative_pct ";
            query += "FROM modelMaster mm, modelTestResult mtr, contentsMaster cm, jobMaster jm ";
            query += "WHERE mm.model_id = mtr.model_id AND mtr.contents_id = cm.contents_id ";
            query += "AND cm.job_id = jm.job_seq ";
            query += "GROUP BY mm.model_id, cm.job_id ";
            
            mysqlConn.query(query, function (err, rows) {
                callback(null, rows);
            });
            
        }
        , function (callback) {
            var query = "";
            query += "SELECT count(*) as cnt ";
            query += "FROM (SELECT mm.model_id, cm.job_id ";
            query += "FROM modelMaster mm, modelTestResult mtr, contentsMaster cm, jobMaster jm ";
            query += "WHERE mm.model_id = mtr.model_id AND mtr.contents_id = cm.contents_id ";
            query += "AND cm.job_id = jm.job_seq ";
            query += "GROUP BY mm.model_id, cm.job_id) a ";
            
            mysqlConn.query(query, function (err, cnt) {
                callback(null, cnt);
            });
            
        }
    ], function (err, results) {
        res.jsonp({
            "cnt": results[1]
            , 'rows': results[0]
        });
        
    });
        
});

router.post('/graph', function (req, res) {
    var mysqlConn = req.mysqlConn;
    var dataType = req.body.dataType
    var query = "select * from chartExample where type='" + dataType + "'";
    //console.log("post graph query: " + query);
    //var query = "select * from chartExample where type= eelike concat('%', '" + dataType + "', '%')"
    var query = mysqlConn.query(query, function (err, rows) {
        // console.log(rows);
        res.jsonp({
            "rows": rows
        });
    });
    console.log(query);
});
router.get('/', ensureAuthenticated, function (req, res, next) {
    res.render('test', {
        "title": 'test'
    });
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}
router.post('/complete', ensureAuthenticated, function (req, res, next) {
    var selId = req.body.sel_id;
    var db = req.db;
    var test_cols = db.get('memo');
    test_cols.update({
        "_id": selId
    }, {
        $set: {
            "complete": true
        }
    }, function (err, doc) {
        if (err) {
            throw err;
        }
        else {
            req.flash('success', 'post completed');
            res.jsonp({
                "error_code": 0
            });
            // res.location('/memo');
            // res.redirect('/memo');
            // searchHandler(req, res, next);
        }
    });
});
router.post('/cancelComplete', ensureAuthenticated, function (req, res, next) {
    var selId = req.body.sel_id;
    var db = req.db;
    var test_cols = db.get('contents');
    test_cols.update({
        "_id": selId
    }, {
        $set: {
            "complete": false
        }
    }, function (err, doc) {
        if (err) {
            throw err;
        }
        else {
            req.flash('success', 'Cancel post completion');
            res.jsonp({
                "error_code": 0
            });
            // res.location('/memo');
            // res.redirect('/memo');
            // searchHandler(req, res, next);
        }
    });
});

function doJsonSearch(req, res, searchText, searchTags, curPage, completeBool) {
    var db = req.db;
    var test_cols = db.get('contents');
    var searchQeury;
    if (searchTags != 'All') {
        if (completeBool) {
            searchQeury = {
                "$or": [{
                    "title": {
                        "$regex": searchText
                    }
                }, {
                    "contents": {
                        "$regex": searchText
                    }
                }]
                , "tags": searchTags
                , 'reg_id': req.user.name
            };
        }
        else {
            searchQeury = {
                "complete": {
                    "$ne": true
                }
                , "$or": [{
                    "title": {
                        "$regex": searchText
                    }
                }, {
                    "contents": {
                        "$regex": searchText
                    }
                }]
                , "tags": searchTags
                , 'reg_id': req.user.name
            };
        }
    }
    else {
        if (completeBool) {
            searchQeury = {
                "$or": [{
                    "title": {
                        "$regex": searchText
                    }
                }, {
                    "contents": {
                        "$regex": searchText
                    }
                }]
                , 'reg_id': req.user.name
            };
        }
        else {
            searchQeury = {
                "complete": {
                    "$ne": true
                }
                , "$or": [{
                    "title": {
                        "$regex": searchText
                    }
                }, {
                    "contents": {
                        "$regex": searchText
                    }
                }]
                , 'reg_id': req.user.name
            };
        }
    }
    // var searchFields = {_id: 1, tags: 1, title: 1, edit_date: 1, contents: 0, reg_date: 0, complete: 0, due_date: 0, notice_bool: 0, reg_id: 0};
    var searchFields = {
        contents: 0
        , reg_date: 0
        , complete: 0
        , due_date: 0
        , notice_bool: 0
        , reg_id: 0
    };
    async.parallel([
        function (callback) {
            test_cols.distinct('tags', {
                'reg_id': req.user.name
            }, function (err, categories) {
                callback(null, categories.sort());
            });
        }
        , function (callback) {
            test_cols.find(searchQeury, {
                fields: searchFields
                , sort: {
                    edit_date: -1
                }
                , skip: (curPage - 1) * perPage
                , limit: perPage
            }, function (err, test_cols) {
                callback(null, test_cols);
            });
        }
        , function (callback) {
            test_cols.count(searchQeury, function (err, cnt) {
                callback(null, cnt);
            });
        }
    ], function (err, results) {
        res.jsonp({
            "test_cols": results[1]
            , 'curPage': curPage
            , 'keywords': results[0]
            , 'searchText': searchText
            , 'total_cnt': results[2]
        });
    });
}

router.post('/search', ensureAuthenticated, function (req, res, next) {
    searchHandler(req, res, next);
});

router.post('/searchDetail', ensureAuthenticated, function (req, res, next) {
    var db = req.db;
    var test_cols = db.get('contents');
    var selId = new ObjectID(req.body.sel_id);
    test_cols.find({
        _id: selId
    }, function (err, test_cols) {
        res.jsonp({
            "detailObj": test_cols
        });
    });
});

function searchHandler(req, res, next) {
    var searchText = req.body.searchText === undefined ? '' : req.body.searchText;
    var curPage = req.body.curPage === undefined ? 1 : req.body.curPage;
    var searchTags = req.body.searchTags === undefined ? 'All' : req.body.searchTags;
    var completeBool = req.body.completeBool === undefined ? false : req.body.completeBool;
    doJsonSearch(req, res, searchText, searchTags, curPage, completeBool);
}

router.post('/savePost', ensureAuthenticated, function (req, res, next) {
    // get form values
    var selContents = req.body.sel_contents;
    var selTitle = req.body.sel_title;
    var selTags = req.body.sel_tags;
    var selId = req.body.sel_id;
    var selDueDate = req.body.sel_due_date;
    var selNoticeBool = req.body.sel_notice_bool;
    var db = req.db;
    var test_cols = db.get('contents');
    if (selId == '') {
        test_cols.insert({
            "contents": selContents
            , "title": selTitle
            , "tags": selTags
            , "reg_date": new Date()
            , "edit_date": new Date()
            , "due_date": selDueDate
            , "notice_bool": selNoticeBool
            , "complete": "n"
            , 'reg_id': req.user.name
        }, function (err, test_cols) {
            if (err) {
                res.send('There was an issue submitting the post');
            }
            else {
                // req.flash('success', 'Post Submitted');
                // res.jsonp({
                //                 "error_code": 0
                //             });
                // res.location('/memo');
                // res.redirect('/memo');
                searchHandler(req, res, next);
            }
        });
    }
    else {
        test_cols.update({
            "_id": selId
        }, {
            $set: {
                "contents": selContents
                , "title": selTitle
                , "tags": selTags
                , "reg_date": new Date()
                , "edit_date": new Date()
                , "due_date": selDueDate
                , "notice_bool": selNoticeBool
            }
        }, function (err, doc) {
            if (err) {
                throw err;
            }
            else {
                //req.flash('success', 'Comment Added');
                // res.jsonp({
                //                 "error_code": 0
                //             });
                // // res.location('/posts/show/'+selId);
                // // res.redirect('/posts/show/'+selId);
                // res.location('/memo');
                // res.redirect('/memo');
                searchHandler(req, res, next);
            }
        });
    }
});

module.exports = router;