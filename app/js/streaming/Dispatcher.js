* Dispatcher
 * 
 * A small event dispacher helper for general usage.
 */ 
var Dispatcher = {
    events: {},
    /**
     * Emit an event that can be handled by subscribed handlers.
     * 
     * @param event    An event type identifier.
     * @param payload  An object that can be sent to event handlers and.
     * 
     * @return  A boolean flag that notify if the event was sent to any handler (`true`) or not (`false`).
     * 
     */
    emit: function (event, payload) {
      var listeners = this.events[ event ];
      if (listeners) {
        for (var i = listeners.length - 1; i >= 0; i--) {
          var listener = listeners[ i ];
          listener.callback.call(listener.scope, {type: event, payload: payload})
        };
        return true;
      }
      return false;
    },

    /**
     * Subscribe a callback for given event type.
     * 
     * @param event      The type of event to be handled.
     * @param callback   The function that receive event when the event be emited.
     * @param scope      The `this` scope inside callback (not required).
     * 
     */ 
    on: function (event, callback, scope) {
      var listeners = this.events[ event ];
      if ( !listeners ) {
        listeners = []
      }
      
      listeners[ listeners.length ] = {callback: callback, scope: scope || this}
      this.events[ event ] = listeners;
    },

    // 
    /**
     * Unsubscribe a event previously added.
     * 
     * @param event     The event type associated to a callback to be unsubscribed.
     * @param callback  The callback to be unsubscribed.
     * 
     */ 
    off: function (event, callback) {
      var listeners = this.events[ event ];
      
      if ( listeners ) {
        for (var i = listeners.length - 1; i >= 0; i--) {
          var listener = listeners[i]

          if( listener.callback === callback ) {
            listeners.splice(i, 1)
            break;
          }
        }

        if( !listeners.length ) {
          this.events[ event ] = undefined;
        }
      }
    }
  }