
const cheerio = require('cheerio')
const request = require('request').defaults({ strictSSL: true })
const assert = require('assert')

const awsAmiListUrl = 'https://aws.amazon.com/amazon-linux-ami/'
const awsTableSelector = '.aws-table > table:nth-child(1) tr'

const regionMap = {
  "us east n. virginia":     "us-east-1",      
  "us west oregon":          "us-west-2",      
  "us west n. california":   "us-west-1",      
  "eu ireland":              "eu-west-1",      
  "eu frankfurt":            "eu-central-1",   
  "asia pacific tokyo":      "ap-northeast-1", 
  "asia pacific singapore":  "ap-southeast-1", 
  "asia pacific sydney":     "ap-southeast-2", 
  "south america são paolo": "sa-east-1",      
  "china beijing":           "cn-north-1",     
  "aws govcloud":            "us-gov-west-1",  
}

var columnNames = [ 
  "region",
  "hvm (ssd) ebs-backed 64-bit",
  "hvm instance store 64-bit",
  "pv ebs-backed 64-bit",
  "pv instance store 64-bit",
  "hvm (graphics) ebs-backed 64-bit"
]

var columnAttributes = [
  { virtualizationType: 'hvm', storageType: 'ebs'      },
  { virtualizationType: 'hvm', storageType: 'instance' },
  { virtualizationType: 'pv',  storageType: 'ebs'      },
  { virtualizationType: 'pv',  storageType: 'instance' }
]

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function parseAmi(body) {
  var $ = cheerio.load(body)

  var amiData = []

  $(awsTableSelector).each(function(i, row) {
    if (i === 0) {
      // ensure that the column definitions have not changed
      $(row).children().each(function(j, cell) { 
        var actual = $(cell).text().trim().toLowerCase()
        assert.strictEqual(actual, columnNames[j])
      });
      return
    }

    // collect the ami values with region/virtualization/storage
    var region
    $(row).children().each(function(j, cell) {
      var data = $(cell).text().trim().toLowerCase()
      if (j === 0) {
        region = regionMap[data]
      } else if (j <= 4) {
        var attrs = clone(columnAttributes[j - 1])
        attrs.region = region
        attrs.name = data
        amiData.push(attrs)
      }
    });
  });

  return amiData
}

module.exports = function(cb) {
  request.get(awsAmiListUrl, function(err, res, body) {
    if (err) {
      return cb(err)
    }
    if (res.statusCode !== 200) {
      return cb(new Error('Non 200 response: ' + res.statusCode))
    }

    var amiData = parseAmi(body)
    return cb(null, amiData)
  })
}
