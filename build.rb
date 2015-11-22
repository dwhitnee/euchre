#!/usr/bin/ruby
#----------------------------------------------------------------------
# read a manifest file of JS file names, outputs a single Closure compiled
# file
#----------------------------------------------------------------------

require 'fileutils'

srcDir = "scripts/"
buildDir = "build/"

closure    = "/Users/dwhitney/Sites/build/compiler-latest/compiler.jar"
externsDir = "/Users/dwhitney/Sites/build/"

#  --compilation_level=ADVANCED_OPTIMIZATIONS
closure_args = %W{
  --warning_level=VERBOSE
  --language_in=ECMASCRIPT5_STRICT
  --externs #{externsDir}jquery-1.8.externs.js
}

# how to get extern_url into cli?
# http://closure-compiler.googlecode.com/svn/trunk/contrib/externs/jquery-1.8.js

manifest = "Manifest"
output = ARGV[0] || "#{buildDir}scripts.min.js"

#----------------------------------------
def readManifest( manifest )
  scriptList = [];
  file = File.new( manifest, "r")
  while (line = file.gets)
    line.strip!
    if not line.match("#") and not line.empty?
      scriptList.push( line )
    end
  end
  file.close
  return scriptList
end

#----------------------------------------
scripts = readManifest( manifest )
cmd = "java -jar #{closure} #{closure_args.join(" ")}"
scripts.each do |script|
  cmd << " --js #{srcDir}#{script}"
end
cmd << " --js_output_file=#{output}"

puts cmd

FileUtils.mkdir_p buildDir

system( cmd );
