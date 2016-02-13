var Router = require("vertx-web-js/router");
var BridgeEvent = require("vertx-web-js/bridge_event");
var SockJSHandler = require("vertx-web-js/sock_js_handler");
var StaticHandler = require("vertx-web-js/static_handler");

var router = Router.router(vertx);

// Allow outbound traffic to the news-feed address

var options = {
  "inboundPermitteds" : [
    {
      "address" : "chat.to.server"
    }
  ],
  "outboundPermitteds" : [
    {
      "address" : "chat.to.client"
    },
    {
      "address" : "news-feed"
    }
  ]
};

router.route("/eventbus/*").handler(SockJSHandler.create(vertx).bridge(options, function (event) {

  // You can also optionally provide a handler like this which will be passed any events that occur on the bridge
  // You can use this for monitoring or logging, or to change the raw messages in-flight.
  // It can also be used for fine grained access control.

  if (event.type() == "SOCKET_CREATED" || event.type() == "SOCKET_CLOSED") {
    console.log("event " + event.type() );
    var socket = event.socket();
    console.log("id: " + socket.writeHandlerID())
  }
  else
  {
    console.log(event.type() + " Message " + JSON.stringify(event.rawMessage()) );
  }

  // This signals that it's ok to process the event
  event.complete(true);

}).handle);

// Serve the static resources
router.route().handler(StaticHandler.create().handle);

vertx.createHttpServer().requestHandler(router.accept).listen(8080);

var eb = vertx.eventBus();

// Publish a message to the address "news-feed" every second
vertx.setPeriodic(1000, function (t) {
  var timestamp = Java.type("java.text.DateFormat").getDateTimeInstance(Java.type("java.text.DateFormat").SHORT, Java.type("java.text.DateFormat").MEDIUM).format(Java.type("java.util.Date").from(Java.type("java.time.Instant").now()));
  eb.publish("news-feed", "Server time " + timestamp);
});

// Register to listen for messages coming IN to the server
eb.consumer("chat.to.server").handler(function (message) {
  // Create a timestamp string
  var timestamp = Java.type("java.text.DateFormat").getDateTimeInstance(Java.type("java.text.DateFormat").SHORT, Java.type("java.text.DateFormat").MEDIUM).format(Java.type("java.util.Date").from(Java.type("java.time.Instant").now()));

  // Send the message back out to all clients with the timestamp prepended.
  eb.publish("chat.to.client", timestamp + ": " + message.body());
});
