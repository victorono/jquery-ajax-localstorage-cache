/**
 * https://github.com/SaneMethod/jquery-ajax-localstorage-cache
 */
(function($){
    /**
     * Prefilter for caching ajax calls.
     * See also $.ajaxTransport for the elements that make this compatible with jQuery Deferred.
     * New parameters available on the ajax call:
     * localCache   : true // required - either a boolean (in which case localStorage is used), or an object
     * implementing the Storage interface, in which case that object is used instead.
     * cacheTTL     : 1,           // optional - cache time in hours, default is 1.
     * cacheKey     : 'post',      // optional - key under which cached string will be stored
     * isCacheValid : function  // optional - return true for valid, false for invalid
     * @method $.ajaxPrefilter
     * @param options {Object} Options for the ajax call, modified with ajax standard settings
     */
    $.ajaxPrefilter(function(options){

        if (!options.localCache) return;

        var storage = (options.localCache === true) ? window.localStorage : options.localCache,
            hourstl = options.cacheTTL || 1,
            cacheKey = options.cacheKey || options.url.replace(/jQuery.*/,'') + options.type + options.data,
            ttl = storage.getItem(cacheKey + 'cachettl'),
            cacheValid = options.isCacheValid,
            value;
            
        if (cacheValid && typeof cacheValid === 'function' && !cacheValid()){
            storage.removeItem(cacheKey);
        }

        if (ttl && ttl < +new Date()){
            storage.removeItem(cacheKey);
            storage.removeItem(cacheKey + 'cachettl');
            ttl = 'expired';
        }

        value = storage.getItem( cacheKey );
        if (!value){
            // If it not in the cache, we store the data, add success callback - normal callback will proceed
            if (options.success) {
                options.realsuccess = options.success;
            }
            options.success = function( data ) {
                var strdata = data;
                if (this.dataType.indexOf('json') === 0) strdata = JSON.stringify(data);

                // Save the data to storage catching exceptions (possibly QUOTA_EXCEEDED_ERR)
                try {
                    storage.setItem( cacheKey, strdata );
                } catch (e) {
                    // Remove any incomplete data that may have been saved before the exception was caught
                    storage.removeItem( cacheKey );
                    storage.removeItem( cacheKey + 'cachettl' );
                    console.log('Cache Error:'+e, cacheKey, strdata );
                }

                if (options.realsuccess) options.realsuccess(data);
            };

            // store timestamp
            if (!ttl || ttl === 'expired') {
                storage.setItem(cacheKey + 'cachettl', +new Date() + 1000 * 60 * 60 * hourstl);
            }
        }
    });

    /**
     * This function performs the fetch from cache portion of the functionality needed to cache ajax
     * calls and still fulfill the jqXHR Deferred Promise interface.
     * See also $.ajaxPrefilter
     * @method $.ajaxTransport
     * @params options {Object} Options for the ajax call, modified with ajax standard settings
     */
    $.ajaxTransport("+*", function(options){
        if (options.localCache)
        {
            var cacheKey = options.cacheKey || options.url.replace(/jQuery.*/,'') + options.type + options.data,
                storage = (options.localCache === true) ? window.localStorage : options.localCache,
                value = (storage) ? storage.getItem(cacheKey) : false;

            if (value){
                // In the cache? Get it, parse it to json if the dataType is JSON,
                // and call the completeCallback with the fetched value.
                if (options.dataType.indexOf('json') === 0) value = JSON.parse(value);
                return {
                    send: function(headers, completeCallback) {
                        var response = {};
                        response[options.dataType] = value;
                        completeCallback(200, 'success', response, '');
                    },
                    abort: function() {
                        console.log("Aborted ajax transport for json cache.");
                    }
                };
            }
        }
    });
})(jQuery);
