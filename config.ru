ENV['TIMEZONE'] = 'Europe/Paris'
ENV['LOGGING'] = 'true'
# ENV['DATABASE_URL'] = 'postgres://tumblr-explorer:tumblr-explorer@localhost/tumblr-explorer'
require 'tumblr-explorer'
run TumblrExplorer
