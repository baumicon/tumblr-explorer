var currentTumblr = null;

var tumblrsByUrl = new Object();
var tumblrsById = new Object();

var posts = new Object();

var taggedTumblrs = new Object();

$(function() {
    $("#fullScreen img").load(function() {
        $("#explorer, #via").fadeTo(500, 0.1, function() {
            $("#fullScreen").fadeIn(500);
        });
    });

    $('#error').ajaxError(function() {
        $(this).fadeIn().delay(5000).fadeOut();
    });

    $.history.init(function(tumblrUrl) {
        if (tumblrUrl == "") {
            if (currentTumblr) {
                currentTumblr = null;
                $("#explorer, #via, #navigation, .navigationContent").slideUp(function() {
                    $(".post").remove();
                    $("#explorerTitle").hide();
                    $("#explorer").show();
                    $("#mainForm").slideDown();
                });
            } else {
                // starting the app: doing nothing
            }
        } else {
            $("#navigation").slideDown(addNavigationDisplayTumblrLink);
            $("#explorer, #via, #mainForm, .navigationContent").slideUp(function() {
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

    addNavigationDisplayTumblrLink();
});

function displayMain() {
    var url = $("input[name=u]").val();
    if (url != "") {
        $.getJSON('/tumblr?u=' + url, function(tumblr) {
            storeTumblr(tumblr);
            $("#mainForm").slideUp($.history.load(tumblr.url));
        });
    }
}

function displayCurrentTumblr() {
    currentTumblr.viewed = true;
    $("#explorerTitle").html(createTagTumblrLink(currentTumblr.id) + " <a href='" + currentTumblr.url + "' target='_blank'>" + currentTumblr.name + "</a>").slideDown();
    bindTagTumblrLink(currentTumblr.id);
    for (var i = 0; i < Math.min(25, currentTumblr.posts.length); i++) {
        var currentPost = currentTumblr.posts[i];
        currentPost.timestamp = new Date(currentPost.timestamp);
        var content = "<div class='post' id='post_" + currentPost.id + "'>" +
                "<div class='postImage' id='divImage_" + currentPost.id + "'>" +
                "<a title='Zoom' onclick='showFullScreen(" + currentPost.id + ");'><img id='image_" + currentPost.id + "'></a>";
        content += "<div class='postDate'>" +
                "<a href='" + currentPost.url + "'target='_blank' title='Go to the post's page'>" + formattedDate(currentPost.timestamp) + "</a>";
        if (currentPost.via) {
            content += " <a href='#' id='more_" + currentPost.id + "' title='Other posts from " + currentPost.via + "' onclick='displayVia(" + currentPost.id + "); return false;'>⇢</a>";
        }
        content += "</div>";
        $("#explorerContent").append(content);
        $("#image_" + currentPost.id).load(
                                          function() {
                                              $(this).parent().parent().parent().slideDown(2000);
                                          }).attr('src', currentPost.small_image_url);
    }
}

function displayVia(id) {
    $.each(currentTumblr.posts, function(i, post) {
        if (post.id == id) {
            var createVia = function(tumblr) {
                var via = $("#via");
                var numberDisplayed = 0;
                var i = 0;
                while ((numberDisplayed != 10) && (i < tumblr.posts.length)) {
                    var currentPost = tumblr.posts[i];
                    if (currentPost.id != id) {
                        var content = "<span class='via'>" +
                                "<img title='Zoom' id='viaImage_" + currentPost.id + "'onclick='showFullScreen(" + currentPost.id + ");'>"
                                + "</span>";
                        via.append(content);
                        $("#viaImage_" + currentPost.id).load(
                                                             function() {
                                                                 $(this).parent().slideDown(2500);
                                                             }).attr('src', currentPost.small_image_url);
                        numberDisplayed++;
                    }
                    i++;
                }
            };

            var displayTumblrInVia = function(tumblr) {
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
                    $("#via").slideUp(function() {
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

function storeTumblr(tumblr) {
    tumblrsByUrl[tumblr.url] = tumblr;
    tumblrsById[tumblr.id] = tumblr;
    for (var i = 0; i < tumblr.posts.length; i++) {
        var post = tumblr.posts[i];
        post.timestamp = new Date(post.timestamp);
        posts[post.id] = post;
    }
}


function showFullScreen(postId) {
    var post = posts[postId];
    $("#fullScreenLink").attr('href', post.url).html(formattedDate(post.timestamp));
    $("#fullScreen img").attr('src', post.max_image_url);


}

function hideFullScreen() {
    $("#fullScreen").fadeOut(250, function() {
        $("#explorer, #via").fadeTo(250, 1);
    });
}

/** Tumblr tagging **/

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
    $(".tumblr_tag_" + tumblrId).click(function() {
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
    $(".tumblr_tag_" + tumblrId).attr('title', 'Tag this tumblr').fadeOut(300, function() {
        $(this).text("☆").unbind('click').fadeIn(300);
        bindTagTumblrLink(tumblrId);
    });
}

function navigationDisplayTumblrs() {
    var content = "<ul>";
    $.each(taggedTumblrs, function(i, tumblr) {
        content += "<li><a " + (tumblr.viewed ? ' class="visited"' : '') + "href='#' title='Show this tumblr' onclick='$.history.load(\"" + tumblr.url + "\"); return false;'>" + tumblr.name + "</a></li>";
    });
    content += "</ul>";
    $("#taggedTumblrs").html(content).slideDown();
    $("#navigationTumblrs").unbind('click').click(
                                                 function() {
                                                     navigationHideTumblrs();
                                                     return false;
                                                 }).attr('title', 'Hide tagged tumblrs')
}

function addNavigationDisplayTumblrLink() {
    $("#navigationTumblrs").unbind('click').click(
                                                 function() {
                                                     navigationDisplayTumblrs();
                                                     return false;
                                                 }).attr('title', 'Show tagged tumblrs')
}

function navigationHideTumblrs() {
    $("#taggedTumblrs").slideUp();
    addNavigationDisplayTumblrLink();
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