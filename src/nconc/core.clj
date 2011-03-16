(ns nconc.core
  (:use nconc.app)
  (:use nconc.middleware)
  (:use compojure.core)
  (:use hiccup.core)
  (:use hiccup.page-helpers)
  (:use ring.middleware.file)
  (:use ring.middleware.file-info)
  (:use ring.middleware.reload)
  (:use ring.middleware.stacktrace)
  (:use ring.util.response)
  (:use ring.adapter.jetty))

(def production?
     (= "production" (get (System/getenv) "NCONC_SERVER_ENV")))

(def development?
     (not production?))

(defroutes handler
  (GET "/shell" []
       (view-shell))
  (GET "/nconc" []
       (view-nconc)))

(def app
     (-> #'handler
	 (wrap-file "public")
	 (wrap-file-info)
	 (wrap-request-logging)
	 (wrap-if development?
		  wrap-reload
		  '[nconc.middleware
		    nconc.app
		    nconc.core])
	 #_(wrap-bounce-favicon)
	 (wrap-exception-logging)
	 (wrap-if production?  wrap-failsafe)
	 (wrap-if development? wrap-stacktrace)))

(defn -main [& args]
  (let [port (Integer/parseInt (get (System/getenv) "NCONC_SERVER_PORT" "8383"))]
    (run-jetty #'app {:port port})))
