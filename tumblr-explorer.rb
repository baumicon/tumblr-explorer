require 'rubygems'
require 'bundler'
Bundler.setup

require 'json'
require 'logger'
require 'tzinfo'
require 'nokogiri'
require 'open-uri'
require 'sinatra/base'

require 'builder'

['TIMEZONE'].each do |param|
  unless ENV[param]
    raise "#{param} env parameter is missing"
  end
end

require 'sinatra'
require 'sinatra/sequel'

require 'sequel/extensions/named_timezones'
Sequel.default_timezone             = TZInfo::Timezone.get(ENV['TIMEZONE'])
Sequel::Model.raise_on_save_failure = true
require 'erb'

module Sequel
  class Database
    def table_exists?(name)
      begin
        from(name).first
        true
      rescue Exception
        false
      end
    end
  end
end

class TumblrExplorer < Sinatra::Base

  set :app_file, __FILE__
  set :root, File.dirname(__FILE__)
  set :static, true
  set :public, Proc.new { File.join(root, "public") }
  set :views, Proc.new { File.join(root, "views") }

  set :raise_errors, true
  set :show_exceptions, :true

  if ENV['LOGGING']
    set :logging, true
  else
    set :logging, false
  end

  configure :development do
    database.loggers << Logger.new(STDOUT)
  end

  # models
  migration 'create table tumblrs' do
    database.create_table :tumblrs do
      primary_key :id, :type => Integer, :null => false
      Text :url, :null => false, :index => true, :unique => true
      Text :name, :null => true
      DateTime :timestamp, :null => true
    end
  end

  migration 'create table posts' do
    database.create_table :posts do
      primary_key :id, :type => Integer, :null => false
      Text :url, :null => false, :index => true, :unique => true
      Text :small_image_url, :null => false
      Text :max_image_url, :null => false
      foreign_key :tumblr_id, :tumblrs
      foreign_key :via_id, :tumblrs
      DateTime :timestamp, :null => false
    end

  end

  class Tumblr < Sequel::Model
    one_to_many :posts, :eager_graph => :via, :order => :timestamp.desc
  end

  class Post < Sequel::Model
    many_to_one :tumblr
    many_to_one :via, :key => :via_id, :class => Tumblr
  end

  get '/' do
    send_file "public/index.html"
  end

  # Regex to test if an url could a an tumblr
  TEST_TUMBLR_REGEX= /\Ahttp:\/\/([^\/]+\/post\/\d+.+|[^.]+.tumblr.com)\z/

  get '/tumblr' do
    begin
      if u = params[:u]
        unless u.start_with? 'http'
          u = "http://#{u}"
        end
        unless u.end_with? "/"
          u = "#{u}/"
        end
        if url = validate_url(u)
          t = Tumblr.filter(:url => url).first
          if t
            # feed exist
            unless t.timestamp
              # feed exist but never fetched
              database.transaction do
                doc = Nokogiri::HTML(open("#{url}api/read?filter=html&num=50&type=photo"))
                t.update(:timestamp => DateTime.now, :name => doc.search('tumblelog').first['name'])
                extract_posts(doc, t)
              end
            end
          else
            # feed does not exist
            doc = Nokogiri::HTML(open("#{url}api/read?filter=html&num=50&type=photo"))
            database.transaction do
              t = Tumblr.create(:url => u, :timestamp => DateTime.now, :name => doc.search('tumblelog').first['name'])
              extract_posts(doc, t)
            end
          end

          # here we have a tumblr with some posts
          content_type :json
          {:id => t.id,
           :url => t.url,
           :name => t.name,
           :posts => t.posts.collect { |p| {
               :id => p.id,
               :url => p.url,
               :small_image_url => p.small_image_url,
               :max_image_url => p.max_image_url,
               :timestamp => p.timestamp,
               :via => (p.via ? p.via.url : nil)} }}.to_json
        else
          raise Sinatra::NotFound
        end
      else
        raise Sinatra::NotFound
      end
    rescue SocketError
      raise Sinatra::NotFound
    rescue OpenURI::HTTPError
      raise Sinatra::NotFound
    end
  end

  private

  def root_url url
    URI.parse(url).merge("/").normalize.to_s
  end

  def validate_url url
    begin
      u = URI.parse(url)
      if [URI::HTTP, URI::HTTPS].include? u.class
        u.normalize.to_s
      else
        nil
      end
    rescue URI::InvalidURIError
      return nil
    end
  end


  # Extract posts from a tumblr url
  def extract_posts(doc, t)
    doc.search('post').each do |post|
      post_url  = post['url']
      small_image_url = post.search('photo-url[@max-width="400"]').first
      if small_image_url
        small_image_url = small_image_url.content
        max_image_url = post.search('photo-url[@max-width="1280"]').first
        if max_image_url
          max_image_url = max_image_url.content
        end

        # try to locate a possible original blog
        via       = nil
        link      = post.search('photo-link-url').first
        if link
          link = validate_url(link.content)
          if link =~ TEST_TUMBLR_REGEX
            via = root_url(link)
          end
        end
        if via
          caption = post.search('photo-caption').first
          if caption
            Nokogiri::HTML.fragment(caption.content).search('a').each do |a|
              unless via
                href = a['href']
                if href && (href =~ TEST_TUMBLR_REGEX)
                  via = root_url(href)
                end
              end
            end
          end
        end
        t_via =via ? (Tumblr.filter(:url => via).first || Tumblr.create(:url => via)) : nil
        Post.create(:url => post_url,
                    :small_image_url => small_image_url,
                    :max_image_url => max_image_url,
                    :tumblr => t,
                    :timestamp => Time.at(post['unix-timestamp'].to_i).send(:to_datetime),
                    :via => t_via)
      else
        p post
      end
    end
  end

end
