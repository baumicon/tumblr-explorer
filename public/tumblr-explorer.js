var currentTumblr = null;

var tumblrs = [];

function displayMain() {
    var url = $("input[name=u]").val();
    if (url != "") {
        $.getJSON('/tumblr?u=' + url, function(tumblr) {
            currentTumblr = tumblr;
            tumblrs[tumblr.url] = tumblr;
            $("#mainForm").slideUp(
                                  function() {
                                      $("#explorerTitle").html(currentTumblr.name + " <a href='" + currentTumblr.url + "' target='_blank'>→</a>");
                                      for (var i = 0; i < Math.min(25, currentTumblr.posts.length); i++) {
                                          var currentPost = currentTumblr.posts[i];
                                          currentPost.timestamp = new Date(currentPost.timestamp);
                                          var content = "<div class='post' id='post_" + currentPost.id + "'>" +
                                                  "<div class='postImage' id='divImage_" + currentPost.id + "'><img id='image_" + currentPost.id + "'>";
                                          content += "<div class='postDate'>" +
                                                  "<a href='" + currentPost.url + "'target='_blank' title='Go to the post's page'>" + currentPost.timestamp.toLocaleString() + "</a>";
                                          if (currentPost.via) {
                                              content += " <a href='#' id='more_" + currentPost.id + "' title='Other posts from " + currentPost.via + "' onclick='displayVia(" + currentPost.id + "); return false;'>⇥</a>";
                                          }
                                          content += "</div>";
                                          $("#explorerContent").append(content);
                                          $("#image_" + currentPost.id).load(
                                                                            function() {
                                                                                $(this).parent().parent().slideDown(2000);
                                                                            }).attr('src', currentPost.small_image_url);
                                      }
                                  }).remove();
        });
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
                                "<img id='viaImage_" + currentPost.id + "'>"
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
                    $('body').append("<div id='via'><div>emugzmiazug</div></div>");
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