var currentTumblr = null;

var exploredTumblrs = null;

function displayMain() {
    var url = $("input[name=u]").val();
    if (url != "") {
        $.getJSON('/tumblr?u=' + url, function(data) {
        });
    }
}