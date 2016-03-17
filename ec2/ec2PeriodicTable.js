

//var ec2PricingUrl = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json";

var ec2PricingUrl = "ec2.json";

var productTypes = {};
var instanceTypes = {};
var _instanceData;


function makeUI() {
  populateRegionSelector( Object.keys( instanceTypes ));
}

function populateTable( data ) {
  var table = $("#periodicTable");
  table.empty();
  table.append( $('<div class="dataTable"/>') );

  var allTypeNames = Object.keys( data ).sort();

  for (var i=0; i < allTypeNames.length; i++) {
    var instanceType = data[allTypeNames[i]];

    var row = $('<div class="row" />');
    row.append( $('<div class="cell" />').text( allTypeNames[i] ));
    row.append( $('<div class="cell" />').text( instanceType.family ));
    row.append( $('<div class="cell" />').text( instanceType.vcpus + " cores"));
    row.append( $('<div class="cell" />').text( instanceType.speed ));
    row.append( $('<div class="cell" />').text( instanceType.memory ));
    row.append( $('<div class="cell" />').text( instanceType.storage ));
    row.append( $('<div class="cell" />').text( instanceType.networkSpeed ));

    table.append( row );
  }

  table.show();
}

function populateRegionSelector( regions ) {
  var menu = $("#regionSelector");
  for (var i=0; i < regions.length; i++ ) {
    menu.append( $("<option/>").attr( { value: regions[i] }).text( regions[i] ));
  }

  menu.on(
    'change',
    function menuChanged( ev ) {
      var region = ev.target.value;
      populateTable( instanceTypes[region] );
    });

  menu.show();
}


// process the pricing blob, there are 10,000 skus, we need to parse
// out instanceTypes

// productFamilies: "Compute Instance", "IP Address", "Dedicated Host",
// "Data Transfer", "System Operation", "undefined", "Storage",
// "Load Balancer", "NAT Gateway", "Storage Snapshot", "Fee"

function processPricingData( data ) {

  console.log("Got pricing data for " + data.offerCode );

  $.each(
    data.products,
    function( i, product ) {
      productTypes[product.productFamily] = 1;

      if (product.productFamily === "Compute Instance") {

        var attr = product.attributes;

        var skuCount = 1;

        if (instanceTypes[attr.location] &&
            instanceTypes[attr.location][attr.instanceType])
        {
          skuCount = ++instanceTypes[attr.location][attr.instanceType].count;
          // console.log("Dupe " + attr.location + " " + attr.instanceType );
          // tenancy can be shared or dedicated
          // operatingSystem, preInstalledSw, license varies by SKU

        }

        instanceTypes[attr.location] = instanceTypes[attr.location] || {};

        // if (attr.instanceType === "c4.4xlarge" &&
        //     attr.location === "US East (N. Virginia)")
        // {
        //   console.log( JSON.stringify( attr ));
        // }

        instanceTypes[attr.location][attr.instanceType] = {
          vcpus:   attr.vcpu,               // cores
          speed:  attr.clockSpeed,         // GHz
          arch:   attr.processorArchitecture, // 32 or 64 bit
          cpu:    attr.physicalProcessor,  // text desc
          memory: attr.memory,
          storage: attr.storage,
          networkSpeed: attr.networkPerformance,
          family: attr.instanceFamily,  // optimized for storage, cpu, etc
          skuCount: skuCount
        };
      }
    });

  // console.log( Object.keys( productTypes ));
  console.log("instance types = " + Object.keys( instanceTypes ).length );
  console.log("regions = " + JSON.stringify( Object.keys( instanceTypes )));

  $(".loading").hide();
  makeUI();
}


$(".loading").show();
$.getJSON( ec2PricingUrl )
 .done( processPricingData )
 .fail( function( error ) {
          alert( JSON.stringify( error ));
        });
