var currentTumblr = null;

var tumblrs = [];

function displayMain() {
    var url = $("input[name=u]").val();
    if (url != "") {
        $.getJSON('/tumblr?u=' + url, function(data) {
            currentTumblr = data;
            tumblrs[data.url] = data;
            $("#mainForm").slideUp(function() {
                $("#explorerTitle").html(currentTumblr.name + " <a href='" + currentTumblr.url + "' target='_blank'>→</a>");
                var content = "";
                for(var i = 0; i < 25; i++) {
                    var currentPost = currentTumblr.posts[i];
                    currentPost.timestamp = new Date(currentPost.timestamp);
                    content += "<div class='post'>" +
                            "<div class='postImage'><img src='" + currentPost.small_image_url + "'></div>"+
                            "<div class='postDate'>" + currentPost.timestamp.toLocaleString() + "</div>"+
                            "</div>";
                }
                $("#explorerContent").html(content);
                $("#explorer").slideDown();
            })
        });
    }
}