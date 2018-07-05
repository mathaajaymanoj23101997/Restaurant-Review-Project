let cachestart = 'restaurantappoffline';
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cachestart).then(function(cache) {
      return cache.addAll([
        '/',
        './index.html',
        './restaurant.html',
        './css/styles.css',        
        // './css/styles_restaurant_info.css',
        './js/dbhelper.js',
        './js/main.js',
        './js/restaurant_info.js',
        // './js/sw_registration.js',
        // 'node_modules/idb/lib/idb.js',
        './img/1.jpg',
        './img/2.jpg',
        './img/3.jpg',
        './img/4.jpg',
        './img/5.jpg',
        './img/6.jpg',
        './img/7.jpg',
        './img/8.jpg',
        './img/9.jpg',
        './img/10.jpg',
        // './img/default.jpg',
      ]);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restaurant-') && cacheName != cachestart;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })    
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  console.log(event.request);
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        
        return response;
      }
    
      return fetch(event.request).then(networkResponse => {
        if (networkResponse.status === 404) {
          
          return;
        }
        return caches.open(cachestart).then(cache => {
          cache.put(event.request.url, networkResponse.clone());
          
          return networkResponse;
        })
      })
    }).catch(error => {
      console.log('Error:', error);
      return;
    })
  );
});

self.addEventListener('message', (event) => {
    console.log(event);
  
    
    if (event.data.action === 'skipWaiting') {
       self.skipWaiting();
    }
});

self.addEventListener('sync', function (event) {
  if (event.tag == 'myFirstSync') {
    const DBOpenRequest = indexedDB.open('restaurants', 1);
    DBOpenRequest.onsuccess = function (e) {
      db = DBOpenRequest.result;
      let rr = db.transaction('offline-reviews', 'readwrite');
      let host = rr.objectStore('offline-reviews');
      // 1. Get submitted reviews while offline
      let request = host.getAll();
      request.onsuccess = function () {
        // 2. POST offline reviews to network
        for (let i = 0; i < request.result.length; i++) {
          fetch(`http://localhost:1337/reviews/`, {
            body: JSON.stringify(request.result[i]),
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, same-origin, *omit
            headers: {
              'content-type': 'application/json'
            },
            method: 'POST',
            mode: 'cors', // no-cors, cors, *same-origin
            redirect: 'follow', // *manual, follow, error
            referrer: 'no-referrer', // *client, no-referrer
          })
          .then(response => {
            return response.json();
          })
          .then(data => {
            let rr = db.transaction('all-reviews', 'readwrite');
            let host = rr.objectStore('all-reviews');
            let request = host.add(data);
            request.onsuccess = function (data) {
              
              let rr = db.transaction('offline-reviews', 'readwrite');
              let host = rr.objectStore('offline-reviews');
              let request = host.clear();
              request.onsuccess = function () { };
              request.onerror = function (error) {
                console.log('Unable to clear offline-reviews objectStore', error);
              }
            };
            request.onerror = function (error) {
              console.log('Unable to add objectStore to IDB', error);
            }
          })
          .catch(error => {
            console.log('Unable to make a POST fetch', error);
          })
        }
      }
      request.onerror = function (e) {
        console.log(e);
      }
    }
    DBOpenRequest.onerror = function (e) {
      console.log(e);
    }
  }
});