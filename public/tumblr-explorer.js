var currentTumblr = null;

var tumblrs = new Object();

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
                currentTumblr = tumblrs[tumblrUrl];
                if (! currentTumblr) {
                    // refreshed the page
                    $.getJSON('/tumblr?u=' + tumblrUrl, function(tumblr) {
                        currentTumblr = tumblrs[tumblr.url] = tumblr;
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
            tumblrs[tumblr.url] = tumblr;
            $("#mainForm").slideUp($.history.load(tumblr.url));
        });
    }
}

function displayCurrentTumblr() {
    currentTumblr.viewed = true;
    $("#explorerTitle").html(createTagTumblrLink(currentTumblr.url, "tfM_" + currentTumblr.id) + " <a href='" + currentTumblr.url + "' target='_blank'>" + currentTumblr.name + "</a>").slideDown();
    bindTagTumblrLink(currentTumblr.url, "tfM_" + currentTumblr.id);
    for (var i = 0; i < Math.min(25, currentTumblr.posts.length); i++) {
        var currentPost = currentTumblr.posts[i];
        currentPost.timestamp = new Date(currentPost.timestamp);
        var content = "<div class='post' id='post_" + currentPost.id + "'>" +
                "<div class='postImage' id='divImage_" + currentPost.id + "'>" +
                "<a onclick='showFullScreen(\"" + currentPost.max_image_url + "\");'><img id='image_" + currentPost.id + "'></a>";
        content += "<div class='postDate'>" +
                "<a href='" + currentPost.url + "'target='_blank' title='Go to the post's page'>" + currentPost.timestamp.toLocaleString() + "</a>";
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
                                "<img id='viaImage_" + currentPost.id + "'onclick='showFullScreen(\"" + currentPost.max_image_url + "\");'>"
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
                            createTagTumblrLink(tumblr.id, "tfVia_" + tumblr.id) +
                            " <a " + (tumblr.viewed ? ' class="visited"' : '') + "onclick='$.history.load(\"" + tumblr.url + "\"); return false;' href='#'>" + tumblr.name + "</a> " +
                            "</div></div>";
                    $('body').append(content);
                    bindTagTumblrLink(tumblr.id, "tfVia_" + tumblr.id);
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

            if (tumblrs[post.via]) {
                displayTumblrInVia(tumblrs[post.via]);
            } else {
                $.getJSON('/tumblr?u=' + post.via, function(tumblr) {
                    tumblrs[post.via] = tumblr;
                    displayTumblrInVia(tumblr);
                });
            }
        }
    });
}


function showFullScreen(imageUrl) {
    $("#fullScreen img").attr('src', imageUrl);
}

function hideFullScreen() {
    $("#fullScreen").fadeOut(250, function() {
        $("#explorer, #via").fadeTo(250, 1);
    });
}


/**
 * Create the link to manipulate the tag status of a tumblr.
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function createTagTumblrLink(tumblrUrl, divId) {
    var content = "<a id='" + divId + "' ";
    if (taggedTumblrs[tumblrUrl]) {
        content += "href='#' title='Untag tumblr'>★</a>";
    } else {
        content += "href='#' title='Tag tumblr'>☆</a>";
    }
    return content;
}

/**
 * Bind the tag action on a link created by createTagTumblrLink.
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function bindTagTumblrLink(tumblrUrl, divId) {
    if (taggedTumblrs[tumblrUrl]) {
        $("#" + divId).click(function() {
            untagTumblr(tumblrUrl, divId);
            return false;
        })
    } else {
        $("#" + divId).click(function() {
            tagTumblr(tumblrUrl, divId);
            return false;
        })
    }
}

/**
 * Tag a tumblr, called by the action created by bindTagTumblrLink.
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function tagTumblr(tumblrUrl, divId) {
    taggedTumblrs[tumblrUrl] = tumblrs[tumblrUrl];
    $("#" + divId).attr('title', 'Remove from favorites').fadeOut(300, function() {
        $(this).text("★").unbind('click').fadeIn(300);
        bindTagTumblrLink(tumblrUrl, divId);
    });
}

/**
 * Untag a tumblr, called by the action created by bindTagTumblrLink.
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function untagTumblr(tumblrUrl, divId) {
    taggedTumblrs[tumblrUrl] = null;
    $("#" + divId).attr('title', 'Add to favorites').fadeOut(300, function() {
        $(this).text("☆").unbind('click').fadeIn(300);
        bindTagTumblrLink(tumblrUrl, divId);
    });
}

function navigationDisplayTumblrs() {
    var content = "<ul>";
    $.each(taggedTumblrs, function(i, tumblr) {
       content += "<li><a " + (tumblr.viewed ? ' class="visited"' : '') + "href='#' title='Show this tumblr' onclick='$.history.load(\"" + tumblr.url + "\"); return false;'>" + tumblr.name + "</a></li>";
    });
    content += "</ul>";
    $("#taggedTumblrs").html(content).slideDown();
    $("#navigationTumblrs").unbind('click').click(function() {
        navigationHideTumblrs();
        return false;
    }).attr('title', 'Hide tagged tumblrs')
}

function addNavigationDisplayTumblrLink() {
    $("#navigationTumblrs").unbind('click').click(function() {
        navigationDisplayTumblrs();
        return false;
    }).attr('title', 'Show tagged tumblrs')
}

function navigationHideTumblrs() {
    $("#taggedTumblrs").slideUp();
    addNavigationDisplayTumblrLink();
}