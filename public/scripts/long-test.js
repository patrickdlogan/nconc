$(document).ready(function() {

    module("Long-Running Module");

    test("evaluating long-running expressions", function() {
	if (_.isUndefined(window.phantom)) {
	    _.schemeEval(_.schemeRead("(define fact (lambda (n) (fact-aux n 1)))"));
	    _.schemeEval(_.schemeRead("(define fact-aux (lambda (n result) (if (= n 1) result (fact-aux (- n 1) (* n result)))))"));

	    stop(260000);
	    
	    function onReply(topic, msg, data) {
		equal(msg.value, Number.POSITIVE_INFINITY, "(fact 100000) sucks number-wise because of javascript's number system but does not run out of stack");
		start();
	    }

	    var fact_expr     = _.schemeRead("(fact 100000)");
	    var request       = {form: fact_expr, id: "qunit"};
	    var request_topic = "topk.it.nconc.eval.request";
	    var reply_topic   = "topk.it.nconc.eval.reply.qunit";
	    PageBus.subscribe(reply_topic, null, onReply, null);
	    PageBus.publish(request_topic, request);
	} else {
	    console.log("skipping long-running async tests that seem to trouble phantomjs.");
	    ok(true, "phantomjs seems to be having trouble with this async test.");
	}
    });
});
