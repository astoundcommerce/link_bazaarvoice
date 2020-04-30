$(document).ready(function () {
    window.bvCallback = function (BV) {
        if (typeof BV !== 'undefined') {
            BV.reviews.on('show', function () {
                // This line assumes SFRA collapsible panels and is called when clicking on the review summary
                $('.row.reviews:not(.active)').toggleClass('active');
            });
            BV.questions.on('show', function () {
            // This line assumes SFRA collapsible panels and is called when clicking on the Q&A summary
                $('.row.questions:not(.active)').toggleClass('active');
            });
        }
    };
    setTimeout(function () {
        document.getElementById('data-bv-show').style.display = 'block';
    }, 1500);
});
