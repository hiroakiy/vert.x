load('test_utils.js')
load('vertx.js')

var tu = new TestUtils();

var eb = vertx.EventBus;

var numMessages = 10;

function testPersistentReloadWorkQueue() {

  var count = 0;
  var doneHandler = function() {
    if (++count == numMessages) {
      eb.unregisterHandler("done", doneHandler);
      tu.testComplete();
    }
  };

  eb.registerHandler("done", doneHandler);

  var persistorConfig = {address: 'test.persistor', db_name: 'test_db'}
  vertx.deployWorkerVerticle('busmods/mongo_persistor.js', persistorConfig, 1, function() {
    insertWork();
    var queueConfig = {address: 'test.orderQueue', persistor_address: 'test.persistor', collection: 'work'}
    vertx.deployWorkerVerticle('busmods/work_queue.js', queueConfig, 1, function() {
      vertx.deployVerticle('busmods/workqueue/order_processor.js', {dont_send_app_lifecycle: true}, 10);
    });
  });
}

function insertWork() {

  for (var i = 0; i < numMessages; i++) {

    eb.send('test.persistor', {
      collection: 'work',
      action: 'save',
      document: {
        blah: "foo" + i
      }
    });
  }
}

tu.registerTests(this);

tu.appReady();

function vertxStop() {
  tu.unregisterAll();
  tu.appStopped();
}
