var webpack = require("webpack");

module.exports = {
    entry: './webUpload.js',

    output: {
        filename     : "webUpload.min.js",
        chunkFilename: "webUpload.chunk.js",
        libraryTarget: 'umd'
    },

    plugins:[
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            },
            sourceMap: true
        })
    ]

};