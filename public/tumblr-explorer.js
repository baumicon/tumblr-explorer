/**
 * The tumblr currently displayed.
 */
var currentTumblr = null;

/**
 * All the tumblr indexed by their url.
 */
var tumblrsByUrl = new Object();

/**
 * All the tumblr indexed by their id.
 */
var tumblrsById = new Object();

/**
 * All the posts indexed by their id.
 */
var postsById = new Object();

/**
 * The tagged tumblrs by their id.
 */
var taggedTumblrs = new Object();

/**
 * The tagged posts by their id.
 */
var taggedPosts = new Object();

/**
 * Indicates the id of the tumblr displayed in the via panel
 */
var currentVia = null;

var isMobileSafari = false;

/**
 * This status indicates if something is loading or if we can enable the carousel.
 * A positive value indicates that some images have not yet loaded
 * a negative that we are swapping to another tumblr
 * 0 that we can load more posts.
 */
var loadingStatus = -1;

$(function() {
    var deviceAgent = navigator.userAgent.toLowerCase();
    isMobileSafari = deviceAgent.match(/(iphone|ipod|ipad)/);

    if (isMobileSafari) {
        $("#fullScreen, #error").css("position", "absolute");
    }

    $("#fullScreen img").load(function() {
        $("#explorer, #via, .visibleContent, #navigation").fadeTo(500, 0.1, function() {
            $("#fullScreen").fadeIn(500).removeClass("notVisible");
            if (isMobileSafari) {
                $("#fullScreen").css('top', ($(window).scrollTop() + 50));
            }
        });
    });

    $('#error').ajaxError(function() {
        $(this).fadeIn().delay(5000).fadeOut();
        if (isMobileSafari) {
            $(this).css('top', $(window).scrollTop());
        }
    });

    $.history.init(function(tumblrUrl) {
        if (tumblrUrl == "") {
            if (currentTumblr) {
                loadingStatus = -1;
                currentTumblr = null;
                $("#explorer, #via, .visibleContent, #navigation").slideUp(function() {
                    $(".post").remove();
                    $("#explorerTitle").hide();
                    $("#explorer").show();
                    $(".main").slideDown();
                });
            } else {
                // starting the app: doing nothing
            }
        } else {
            loadingStatus = -1;
            $("#navigation").slideDown(function() {
                bindNavigationDisplayTumblrs();
                bindNavigationDisplayPosts();
            });
            $("#explorer, #via, .main, .navigationContent").slideUp(function() {
                $(".post").remove();
                $("#explorerTitle").hide();
                $("#explorer").show();
                currentTumblr = tumblrsByUrl[tumblrUrl];
                if (! currentTumblr) {
                    // refreshed the page
                    $.getJSON('/tumblr?u=' + tumblrUrl, function(tumblr) {
                        storeTumblr(tumblr);
                        currentTumblr = tumblr;
                        displayCurrentTumblr();
                    });
                } else {
                    displayCurrentTumblr();
                }
            });
        }
    });

    bindNavigationDisplayTumblrs();
    bindNavigationDisplayPosts();

    $(window).scroll(function() {
        if ((loadingStatus == 0) && ($(window).scrollTop() == $(document).height() - $(window).height())) {
            loadingStatus = -1;
            var displayNextPosts = function() {
                loadingStatus = 0;
                for (var i = numberOfDisplayedPosts; i < Math.min(numberOfDisplayedPosts + 25, cTumblr.posts.length); i++) {
                    loadingStatus++;
                    addCurrentTumblrPost(cTumblr.posts[i]);
                }
            };
            var numberOfDisplayedPosts = $('.post').length;
            // copy it in case it changes during the fetch
            var cTumblr = currentTumblr;
            if ((! cTumblr.fetchedAllPosts) && (cTumblr.posts.length < (numberOfDisplayedPosts + 25))) {
                // load more posts
                $.getJSON('/more?d=' + currentTumblr.posts.length + '&u=' + currentTumblr.url, function(posts) {
                    $.each(posts, function(i, post) {
                        cTumblr.posts.push(post);
                        storePost(post, cTumblr);
                    });
                    if (posts.length < 50) {
                        cTumblr.fetchedAllPosts = true;
                    }
                    // the displayed tumblr is still the same: display the new posts
                    if (currentTumblr == cTumblr) {
                        displayNextPosts();
                    }
                });
            } else {
                displayNextPosts();
            }
        }
    });

});

function displayMain() {
    var url = $("input[name=u]").val();
    if (url != "") {
        $.getJSON('/tumblr?u=' + url, function(tumblr) {
            storeTumblr(tumblr);
            $(".main").slideUp($.history.load(tumblr.url));
        });
    }
}

/**
 * Display the tumblr stored in currentTumblr.
 */
function displayCurrentTumblr() {
    currentVia = null;
    currentTumblr.viewed = true;
    $("#explorerTitle").html(createTagTumblrLink(currentTumblr.id) + " <a href='" + currentTumblr.url + "' target='_blank'>" + currentTumblr.name + "</a>").slideDown();
    bindTagTumblrLink(currentTumblr.id);
    loadingStatus = 0;
    for (var i = 0; i < Math.min(25, currentTumblr.posts.length); i++) {
        loadingStatus++;
        addCurrentTumblrPost(currentTumblr.posts[i]);
    }
}

/**
 * Add a post to the current tumblr display.
 * @param post the post
 */
function addCurrentTumblrPost(post) {
    var content = "<div class='post' id='post_" + post.id + "'>" +
            "<div class='postImage' id='divImage_" + post.id + "'>" +
            "<a title='Zoom' onclick='showFullScreen(" + post.id + ", false);'><img id='image_" + post.id + "'></a>";
    content += "<div class='postDate'>" +
            createTagPostLink(post.id) +
            " <a href='" + post.url + "'target='_blank' title='Go to the post's page'>" + formattedDate(post.timestamp) + "</a>";
    if (post.via) {
        content += " <a href='#' id='more_" + post.id + "' title='Other posts from " + post.via + "' onclick='displayVia(" + post.id + "); return false;'>→</a>";
    }
    content += "</div>";
    $("#explorerContent").append(content);
    $("#image_" + post.id).load(
                               function() {
                                   var t = $(this);
                                   t.parent().parent().parent().slideDown(2000, function() {
                                       loadingStatus = Math.max(0, loadingStatus - 1);
                                   });
                                   var id = $(this).attr('id');
                                   bindTagPostLink(id.substring(id.lastIndexOf('_') + 1, id.length));
                               }).attr('src', post.small_image_url);
}

/**
 * Display the tumblr where an image is coming from.
 * @param id the post id we clicked on.
 */
function displayVia(id) {
    $.each(currentTumblr.posts, function(i, post) {
        if (post.id == id) {
            var createVia = function(tumblr) {
                for (var i = 0; i < Math.min(10, tumblr.posts.length); i++) {
                    addViaImage(tumblr.posts[i]);
                }
                if (tumblr.posts.length >= 10) {
                    setTimeout(displayViaMore, 2500, post.id, 0);
                }
            };

            var displayTumblrInVia = function(tumblr) {
                currentVia = id;
                var displayVia = function() {
                    var content = "<div id='via'><div>" +
                            createTagTumblrLink(tumblr.id) +
                            " <a " + (tumblr.viewed ? ' class="visited"' : '') + "onclick='$.history.load(\"" + tumblr.url + "\"); return false;' href='#'>" + tumblr.name + "</a> " +
                            "</div></div>";
                    $('body').append(content);
                    bindTagTumblrLink(tumblr.id);
                    $("#via").css('top', $("#image_" + id).offset().top).slideDown(function() {
                        createVia(tumblr);
                    });
                };

                var existingVia = $("#via");
                if (existingVia.length == 0) {
                    displayVia();
                } else {
                    existingVia.stop(true, true).slideUp(function() {
                        $(this).remove();
                        displayVia();
                    });
                }
            };

            if (tumblrsByUrl[post.via]) {
                displayTumblrInVia(tumblrsByUrl[post.via]);
            } else {
                $.getJSON('/tumblr?u=' + post.via, function(tumblr) {
                    storeTumblr(tumblr);
                    displayTumblrInVia(tumblr);
                });
            }
        }
    });
}

/**
 * Add a post's image in the via panel.
 * @param post
 */
function addViaImage(post) {
    var content = "<span class='via'>" +
            "<img title='Zoom' id='viaImage_" + post.id + "'onclick='showFullScreen(" + post.id + ", false);'>"
            + "</span>";
    $("#via").append(content);
    $("#viaImage_" + post.id).load(
                                  function() {
                                      $(this).parent().slideDown(2500);
                                  }).attr('src', post.small_image_url);
}

/**
 * Display more images in the via panel.
 * @param id the id of the post we are displaying the via.
 * @param startingIndex the index where to start displaying the images from.
 */
function displayViaMore(id, startingIndex) {
    if (currentVia == id) {
        var tumblr = tumblrsByUrl[postsById[id].via];
        for (var i = startingIndex; i < Math.min(10 + startingIndex, tumblr.posts.length); i++) {
            addViaImage(tumblr.posts[i]);
        }
        if (tumblr.posts.length >= (10 + startingIndex)) {
            setTimeout(displayViaMore, 2500, id, startingIndex + 10);
        }
    }
}

function storeTumblr(tumblr) {
    tumblrsByUrl[tumblr.url] = tumblr;
    tumblrsById[tumblr.id] = tumblr;
    for (var i = 0; i < tumblr.posts.length; i++) {
        var post = tumblr.posts[i];
        storePost(post, tumblr);
    }
}
function storePost(post, tumblr) {
    post.timestamp = new Date(post.timestamp);
    post.tumblr = tumblr;
    postsById[post.id] = post;
}


function showFullScreen(postId, displayTumblrTitle) {
    updateFullScreenTagPost(postId);
    var post = postsById[postId];
    if (displayTumblrTitle) {
        var titleLink = $("#fullScreenTumblrTitle a");
        if (post.tumblr.viewed) {
            titleLink.addClass("titleLink");
        } else {
            titleLink.removeClass("titleLink");
        }
        titleLink.unbind("click").click(
                                       function() {
                                           hideFullScreen();
                                           $.history.load(post.tumblr.url);
                                           return false;
                                       }).html(post.tumblr.name);
        $("#fullScreenTumblrTitle").removeClass("hidden");
    } else {
        $("#fullScreenTumblrTitle").addClass("hidden");
    }
    $("#fullScreenLink").attr('href', post.url).html(formattedDate(post.timestamp));
    $("#fullScreen img").attr('src', post.max_image_url);


}

function hideFullScreen() {
    $("#fullScreen").fadeOut(250,
                            function() {
                                $("#explorer, #via, .visibleContent, #navigation").fadeTo(250, 1);
                            }).addClass("notVisible");
}

/** Tumblr tagging **/
{
    /**
     * Create the link to manipulate the tag status of a tumblr.
     * @param tumblrId the tumblr id.
     */
    function createTagTumblrLink(tumblrId) {
        var content = "<a class='tumblr_tag_" + tumblrId + "' ";
        if (taggedTumblrs[tumblrId]) {
            content += "href='#' title='Untag this tumblr'>★</a>";
        } else {
            content += "href='#' title='Tag this tumblr'>☆</a>";
        }
        return content;
    }

    /**
     * Bind the tag action on a link created by createTagTumblrLink.
     * @param tumblrId the tumblr id.
     */
    function bindTagTumblrLink(tumblrId) {
        var action = taggedTumblrs[tumblrId] ? untagTumblr : tagTumblr;
        $(".tumblr_tag_" + tumblrId).unbind('click').click(function() {
            action(tumblrId);
            return false;
        });
    }

    /**
     * Tag a tumblr, called by the action created by bindTagTumblrLink.
     * @param tumblrId the tumblr id.
     */
    function tagTumblr(tumblrId) {
        taggedTumblrs[tumblrId] = tumblrsById[tumblrId];
        navigationHideTumblrs();
        $(".tumblr_tag_" + tumblrId).attr('title', 'Untag this tumblr').fadeOut(300, function() {
            $(this).text("★").unbind('click').fadeIn(300);
            bindTagTumblrLink(tumblrId);
        });
    }

    /**
     * Untag a tumblr, called by the action created by bindTagTumblrLink.
     * @param tumblrId the tumblr id.
     */
    function untagTumblr(tumblrId) {
        taggedTumblrs[tumblrId] = tumblrsById[tumblrId];
        navigationHideTumblrs();
        $(".tumblr_tag_" + tumblrId).attr('title', 'Tag this tumblr').fadeOut(300, function() {
            $(this).text("☆").unbind('click').fadeIn(300);
            bindTagTumblrLink(tumblrId);
        });
    }

    function navigationDisplayTumblrs() {
        if ($("#fullScreen").hasClass("notVisible") && (!$.isEmptyObject(taggedTumblrs))) {
            var content = "<ul>";
            $.each(taggedTumblrs, function(i, tumblr) {
                content += "<li><a " + (tumblr.viewed ? ' class="visited"' : '') + "href='#' title='Show this tumblr' onclick='$.history.load(\"" + tumblr.url + "\"); return false;'>" + tumblr.name + "</a></li>";
            });
            content += "</ul>";
            $("#taggedTumblrs").html(content).slideDown().removeClass("notVisibleContent").addClass("visibleContent");
            $("#navigationTumblrs").unbind('click').click(
                                                         function() {
                                                             navigationHideTumblrs();
                                                             return false;
                                                         }).attr('title', 'Hide tagged tumblrs');
        }
    }

    function navigationHideTumblrs() {
        $("#taggedTumblrs").slideUp().addClass("notVisibleContent").removeClass("visibleContent");
        bindNavigationDisplayTumblrs();
    }

    function bindNavigationDisplayTumblrs() {
        $("#navigationTumblrs").unbind('click').click(
                                                     function() {
                                                         navigationDisplayTumblrs();
                                                         return false;
                                                     }).attr('title', 'Show tagged tumblrs')
    }

}

/** Posts tagging **/
{
    /**
     * Create the link to manipulate the tag status of a post.
     * @param postId the post id.
     */
    function createTagPostLink(postId) {
        var content = "<a class='post_tag_" + postId + "' ";
        if (taggedPosts[postId]) {
            content += "href='#' title='Untag this post'>★</a>";
        } else {
            content += "href='#' title='Tag this post'>☆</a>";
        }
        return content;
    }

    function updateFullScreenTagPost(postId) {
        if (taggedPosts[postId]) {
            $(".fullScreenPostTag").attr("title", "Untag this post").html("★");
        } else {
            $(".fullScreenPostTag").attr("title", "tag this post").html("☆");
        }
        var action = taggedPosts[postId] ? untagPost : tagPost;
        $(".fullScreenPostTag").unbind('click').click(
                                                     function() {
                                                         action(postId);
                                                         return false;
                                                     }).attr("id", "fullScreenPostTag_" + postId);
    }

    /**
     * Bind the tag action on a link created by createTagPostLink.
     * @param postId the post id.
     */
    function bindTagPostLink(postId) {
        var action = taggedPosts[postId] ? untagPost : tagPost;
        $(".post_tag_" + postId + ", #fullScreenPostTag_" + postId).unbind('click').click(function() {
            action(postId);
            return false;
        });
    }

    /**
     * Tag a post, called by the action created by bindTagPostLink.
     * @param postId the post id.
     */
    function tagPost(postId) {
        taggedPosts[postId] = postsById[postId];
        navigationHidePosts();
        $(".post_tag_" + postId + ", #fullScreenPostTag_" + postId).attr('title', 'Untag this post').fadeOut(300, function() {
            $(this).text("★").unbind('click').fadeIn(300);
            bindTagPostLink(postId);
        });
    }

    /**
     * Untag a post, called by the action created by bindTagPostLink.
     * @param postId the post id.
     */
    function untagPost(postId) {
        taggedPosts[postId] = postsById[postId];
        navigationHidePosts();
        $(".post_tag_" + postId + ", #fullScreenPostTag_" + postId).attr('title', 'Tag this post').fadeOut(300, function() {
            $(this).text("☆").unbind('click').fadeIn(300);
            bindTagPostLink(postId);
        });
    }

    function bindNavigationDisplayPosts() {
        $("#navigationPosts").unbind('click').click(
                                                   function() {
                                                       navigationDisplayPosts();
                                                       return false;
                                                   }).attr('title', 'Show tagged posts')
    }

    function navigationDisplayPosts() {
        if ($("#fullScreen").hasClass("notVisible") && (!$.isEmptyObject(taggedPosts))) {
            var tPosts = $("#taggedPosts").empty();
            var content = "<ul>";
            $.each(taggedPosts, function(i, post) {
                var content = "<span class='taggedPost'>" +
                        "<img title='Show' id='taggedPost_" + post.id + "' onclick='showFullScreen(" + post.id + ", true);'>"
                        + "</span>";
                tPosts.append(content);
                $("#taggedPost_" + post.id).load(
                                                function() {
                                                    $(this).parent().slideDown(2500);
                                                }).attr('src', post.small_image_url);
            });
            tPosts.slideDown().removeClass("notVisibleContent").addClass("visibleContent");
            $("#navigationPosts").unbind('click').click(
                                                       function() {
                                                           navigationHidePosts();
                                                           return false;
                                                       }).attr('title', 'Hide tagged posts');
        }
    }

    function navigationHidePosts() {
        $("#taggedPosts").slideUp().addClass("notVisibleContent").removeClass("visibleContent");
        bindNavigationDisplayPosts();
    }
}

function twoChars(s) {
    s = s.toString();
    while (s.length < 2) {
        s = "0" + s;
    }
    return s;
}
function formattedDate(timestamp) {
    return twoChars(timestamp.getHours()) + ":" + twoChars(timestamp.getMinutes()) + " " +
            twoChars(timestamp.getDate()) + "/" + twoChars(timestamp.getMonth()) + "/" + timestamp.getFullYear();
}