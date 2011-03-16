(defproject nconc "1.0.0-SNAPSHOT"
  :description "nconc is an implementation of scheme in javascript"
  :main nconc.core
  :dependencies [[org.clojure/clojure "1.2.0"]
                 [org.clojure/clojure-contrib "1.2.0"]
		 [ring "0.3.5"]
		 [compojure "0.5.3"]
		 [hiccup "0.3.1"]
		 #_ [matchure "0.9.1"]]
  :dev-dependencies [[lein-run "1.0.0"]
		     [com.stuartsierra/lazytest "2.0.0-SNAPSHOT"]]
  :repositories {"http://mvnrepository.com/"  "http://mirrors.ibiblio.org/pub/mirrors/maven2"
		 "jena production repository" "http://openjena.org/repo"
		 "clojars"                    "http://clojars.org/repo"
		 "stuartsierra-releases"      "http://stuartsierra.com/maven2"
		 "stuartsierra-snapshots"     "http://stuartsierra.com/m2snapshots"})
