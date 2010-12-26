var currentTumblr = null;

var tumblrs = new Object();

var favoritesTumblrs = new Object();

$(function() {
    $("#fullScreen img").load(function() {
        $("#explorer, #via").fadeTo(500, 0.1, function() {
            $("#fullScreen").fadeIn(500);
        });
    });

    $('#error').ajaxError(function() {
        $(this).fadeIn().delay(5000).fadeOut();
    });
});

function displayMain() {
    var url = $("input[name=u]").val();
    if (url != "") {
        $.getJSON('/tumblr?u=' + url, function(tumblr) {
            currentTumblr = tumblr;
            tumblrs[tumblr.url] = tumblr;
            $("#mainForm").slideUp(displayCurrentTumblr).remove();
        });
    }
}

function displayTumblr(tumblrUrl) {
    $("#explorer, #via").slideUp(function() {
        $(".post").remove();
        $("#explorerTitle").hide();
        $("#explorer").show();
        currentTumblr = tumblrs[tumblrUrl];
        displayCurrentTumblr();
    });
}

function displayCurrentTumblr() {
    $("#explorerTitle").html(createFavoriteLinkTumblr(currentTumblr.url, "tfM_" + currentTumblr.id) + " " + currentTumblr.name + " <a href='" + currentTumblr.url + "' target='_blank'>→</a>").slideDown();
    bindFavoriteLink(currentTumblr.url, "tfM_" + currentTumblr.id);
    for (var i = 0; i < Math.min(25, currentTumblr.posts.length); i++) {
        var currentPost = currentTumblr.posts[i];
        currentPost.timestamp = new Date(currentPost.timestamp);
        var content = "<div class='post' id='post_" + currentPost.id + "'>" +
                "<div class='postImage' id='divImage_" + currentPost.id + "'>" +
                "<a onclick='showFullScreen(\"" + currentPost.max_image_url + "\");'><img id='image_" + currentPost.id + "'></a>";
        content += "<div class='postDate'>" +
                "<a href='" + currentPost.url + "'target='_blank' title='Go to the post's page'>" + currentPost.timestamp.toLocaleString() + "</a>";
        if (currentPost.via) {
            content += " <a href='#' id='more_" + currentPost.id + "' title='Other posts from " + currentPost.via + "' onclick='displayVia(" + currentPost.id + "); return false;'>⇥</a>";
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
                            createFavoriteLinkTumblr(tumblr.id, "tfVia_" + tumblr.id) +
                            " <a onclick='displayTumblr(\"" + tumblr.url + "\"); return false;' href='#'>" + tumblr.name + "</a> " +
                            "</div></div>";
                    $('body').append(content);
                    bindFavoriteLink(tumblr.id, "tfVia_" + tumblr.id);
                    $("#via").css('top', $("#image_" + id).offset().top).slideDown(function() {
                        createVia(tumblr);
                    });
                };

                var existingVia = $("#via");
                if (existingVia.length == 0) {
                    displayVia();
                } else {
                    $("#via").slideUp(displayVia).remove();
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
 * Create the link to manipulate the favorite status of a tumblr.
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function createFavoriteLinkTumblr(tumblrUrl, divId) {
    var content = "<a id='" + divId + "' ";
    if (favoritesTumblrs[tumblrUrl]) {
        content += "href='#' title='Remove from favorites'>★</a>";
    } else {
        content += "href='#' title='Add to favorites'>☆</a>";
    }
    return content;
}

/**
 * Bind the favorite action on a link created by createFavoriteLinkTumblr
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function bindFavoriteLink(tumblrUrl, divId) {
    if (favoritesTumblrs[tumblrUrl]) {
        $("#" + divId).click(function() {
            removeTumblrFromFavorites(tumblrUrl, divId);
            return false;
        })
    } else {
        $("#" + divId).click(function() {
            addTumblrToFavorites(tumblrUrl, divId);
            return false;
        })
    }
}

/**
 * Add a tumblr to the favorites, called by the action created by bindFavoriteLink
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function addTumblrToFavorites(tumblrUrl, divId) {
    favoritesTumblrs[tumblrUrl] = tumblrs[tumblrUrl];
    $("#" + divId).attr('title', 'Remove from favorites').fadeOut(300, function() {
       $(this).text("★").unbind('click').fadeIn(300);
        bindFavoriteLink(tumblrUrl, divId);
    });
}

/**
 * Remove a tumblr from the favorites, called by the action created by bindFavoriteLink
 * @param tumblrUrl the tumblr url.
 * @param divId the id of the link.
 */
function removeTumblrFromFavorites(tumblrUrl, divId) {
    favoritesTumblrs[tumblrUrl] = null;
    $("#" + divId).attr('title', 'Add to favorites').fadeOut(300, function() {
        $(this).text("☆").unbind('click').fadeIn(300);
        bindFavoriteLink(tumblrUrl, divId);
    });
}