var currentTumblr = null;

var tumblrs = [];

function displayMain() {
    var url = $("input[name=u]").val();
    if (url != "") {
        $.getJSON('/tumblr?u=' + url, function(tumblr) {
            currentTumblr = tumblr;
            tumblrs[tumblr.url] = tumblr;
            $("#mainForm").slideUp(function() {
                $("#explorerTitle").html(currentTumblr.name + " <a href='" + currentTumblr.url + "' target='_blank'>→</a>");
                var content = "";
                for (var i = 0; i < 25; i++) {
                    var currentPost = currentTumblr.posts[i];
                    currentPost.timestamp = new Date(currentPost.timestamp);
                    content += "<div class='post' id='post_" + currentPost.id + "'>" +
                            "<div class='postImage' id='image_" + currentPost.id + "'><img src='" + currentPost.small_image_url + "'>";
                    if (currentPost.via) {
                        content += "<a href='#' id='more_" + currentPost.id + "' onclick='displayVia(" + currentPost.id + "); return false;'>→</a>";
                    }
                    content += "</div>" +
                            "<div class='postDate'>" + currentPost.timestamp.toLocaleString() + " " +
                            "<a href='" + currentPost.url + "'target='_blank'>→</a></div>" +
                            "</div>";
                }
                $("#explorerContent").html(content);
                $("#explorer").slideDown();
            })
        });
    }
}

function displayVia(id) {
    $.each(currentTumblr.posts, function(i, post) {
        if (post.id == id) {
            $("#more_" + id).slideUp(function() {
                if (post.via) {
                    if (tumblrs[post.via]) {

                    } else {
                        $.getJSON('/tumblr?u=' + post.via, function(tumblr) {
                            tumblrs[tumblr.url] = tumblr;
                            var imageDiv = $("#image_" + id);
                            var numberDisplayed = 0;
                            var i = 0;
                            while ((numberDisplayed != 5) && (i < tumblr.posts.length)) {
                                var currentPost = tumblr.posts[i];
                                if (currentPost.id != id) {
                                    imageDiv.append("<img src='" + currentPost.small_image_url + "'>");
                                    numberDisplayed++;
                                }
                                i++;
                            }
                        });
                    }
                }
            });

        }
    });
}