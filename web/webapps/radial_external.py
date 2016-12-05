"""
radial.py
create by Brandon Taylor under ECP0769
Date of Creation: 01 July 2016

This module is intended for reading Msg 31 radial headers
in AR2 files.

Currently it outputs the following:
 - VCP
 - Azimuthal Rate (deg/s)
 - Azimuthal Accel. (deg/s^2)
 - Elevation Angle at each radial
 - H & V Noise at each radial

"""

import bz2
from struct import unpack
import sys
import io
import os
import argparse
import numpy as np
from math import isnan
from urllib import urlopen

VOLUME_HEADER_SIZE = 24
MESSAGE_HEADER_SIZE = 16
RPG_ADDED_BYTES = 12
CONTROL_WORD_SIZE = 4
_HEADER = '>HBBHHIHH'
INCOMP_ERR_MSG = "Incomplete Volume! Check L2 spool or try another Volume."
MESSAGE_2_START = 323456

FIELDS = {
    "collect_time": {"priority":True, "format":"Integer*4", "start":4},
    "az_angle": {"priority":True, "format":"Real*4", "start":12},
    "rad_len": {"priority":True, "format":"Integer*2", "start":18},
    "rad_stat": {"priority":True, "format":"Code*1", "start":21},
    "el_no": {"priority":True, "format":"Integer*1", "start":22},
    "el_angle": {"priority":True, "format":"Real*4", "start":24},
    "spot_blank": {"priority":True, "format":"Code*1", "start":28},
    "vol_point": {"priority":False, "format":"Integer*4", "start":32},
    "rad_point": {"priority":True, "format":"Integer*4", "start":40},
    "h_noise": {"priority":False, "format":"Real*4", "start":8},
    "v_noise": {"priority":False, "format":"Real*4", "start":12},
    "vcp": {"priority":False, "format":"Integer*2", "start":40},
    "rda_build": {"priority":False, "format":"Scaled Integer*2", "start":18}
}
DATA_FORMAT = {
    "Code*1": "b",
    "Code*2": "h",
    "Integer*1": "b",
    "Integer*2": "h",
    "Integer*4": "i",
    "Real*4": "f",
    "Real*8": "d",
    "Scaled Integer*1": "b",
    "Scaled Integer*2": "h",
    "Scaled Integer*4": "i",
    "Scaled SInteger*2": "h",
    "Scaled SInteger*4": "i",
    "SInteger*1": "B",
    "SInteger*2": "H",
    "SInteger*4": "I",
    "String": "c",
    "Spare*2": "H",
    "Spare*4": "I",
    "short": "h",
    "unsigned short": "h",
    "int": "i",
    "unsigned int": "i",
    "float": "f",
    "time_t": "i",
    "uint32_t": "i"
}
DATA_SIZE = {
    "B": 1,
    "b": 1,
    "H": 2,
    "h": 2,
    "I": 4,
    "i": 4,
    "f": 4,
    "d": 8,
    }

def running_mean(arr, N):
    return np.convolve(arr, np.ones((N,))/N)[(N-1):]

def getter(key):
    return [DATA_FORMAT[FIELDS[key]["format"]], FIELDS[key]["start"]]

class Message_Header(object):
    def __init__(self, data, start_byte):
        start_byte += RPG_ADDED_BYTES
        header = unpack(_HEADER, data[start_byte : start_byte + MESSAGE_HEADER_SIZE])
        self.msg_size = header[0]
        self.channel = header[1]
        self.msg_type = header[2]
        self.msg_seq_num = header[3]
        self.msg_date = header[4]
        self.msg_time = header[5]
        self.segment_count = header[6]
        self.seg_number = header[7]

class Radial(object):
    def __init__(self, filename, precision):
        self.filename = filename
        self.elevations = {}
        self.collect_time = []
        self.az = []
        self.precision = precision
        self._pos = 0
        self.offset = precision
    def retrieve_build(self):
        try:
            raw_file = urlopen(self.filename) 
            print raw_file.read(VOLUME_HEADER_SIZE*2)
            control_word = raw_file.read(CONTROL_WORD_SIZE)
            print control_word
            metarecord_size = abs(unpack('>i', control_word)[0])
            print metarecord_size
            #print raw_file.read(12)#MESSAGE_HEADER_SIZE + RPG_ADDED_BYTES)
            metarecord = raw_file.read(metarecord_size)
            metadata = bz2.decompress(metarecord)
            if metadata:
                header = Message_Header(metadata,0)
                self.redundant = header.channel
                self.metadata = metadata
                self._rda_build()
                out =  {
                "build":self.build,
                }
            else:
                print INCOMP_ERR_MSG
                out = {"build":False,"err":(INCOMP_ERR_MSG)} 
            raw_file.close() 
            return out
        except Exception as error:
            print ("Error retrieving RDA Build ", self.filename, error)
            return {"build":False,"err":("Error with ", self.filename, str(error))}   
 
    def process_volume(self):
        try:
            raw_file = urlopen(self.filename)
            raw_file.read(VOLUME_HEADER_SIZE)
            control_word = raw_file.read(CONTROL_WORD_SIZE)
            metarecord_size = abs(unpack('>i', control_word)[0])
            metarecord = raw_file.read(metarecord_size)
            self._pos += VOLUME_HEADER_SIZE + CONTROL_WORD_SIZE + metarecord_size 
            metadata = bz2.decompress(metarecord)
            if metadata:
                header = Message_Header(metadata,0)
                self.redundant = header.channel
                print header.msg_type
                if header.msg_type == 31:
                    self.chunk = metadata
                    self._process_chunk
                    self.build = -99
                else:
                    self.metadata = metadata 
                    self._rda_build()
            while self._pos < int(raw_file.info()['Content-Length']):
                control_word = raw_file.read(CONTROL_WORD_SIZE)
                size = abs(unpack('>i', control_word)[0])
                data = raw_file.read(size)
                self._pos += CONTROL_WORD_SIZE + size
                self.chunk = bz2.decompress(data)
                if self.chunk:
                    self._process_chunk()
            if self.elevations:
                self._calc_rate()
                out =  {
                    "VCP":self.VCP,
                    "build":self.build,
                    "redundant": self.redundant,
                    "elevations": self.elevations,
                    "az_rate": self.az_rate,
                    "az_accel":self.az_accel
                }
            else:
                print INCOMP_ERR_MSG
                out = {"VCP":False,"err":(INCOMP_ERR_MSG)}
            raw_file.close()
            return out
        except Exception as error:
            print ("Error processing this volume ", self.filename, error)
            return {"VCP":False,"err":("Error with ", self.filename, str(error))}

    def _rda_build(self):
        m = self.metadata
        header = Message_Header(m, MESSAGE_2_START)
        start = MESSAGE_2_START + MESSAGE_HEADER_SIZE + RPG_ADDED_BYTES
        end = start + header.msg_size * 2 - MESSAGE_HEADER_SIZE
        data = m[start:end]
        build = getter("rda_build")
        self.build = unpack(">"+build[0], data[build[1]:build[1]+DATA_SIZE[build[0]]])[0] / 100.0

    def _process_chunk(self):
        i = 0
        d = self.chunk
        while len(d) - i > 0:
            try:
                header = Message_Header(d, i) 
            except:
                header.msg_type = None
            if header.msg_type == 31:
                i += RPG_ADDED_BYTES + MESSAGE_HEADER_SIZE
                if i == RPG_ADDED_BYTES + MESSAGE_HEADER_SIZE:
                    vol = getter("vol_point")
                    vol_point = unpack(">"+vol[0], d[i+vol[1]:i+vol[1]+DATA_SIZE[vol[0]]])[0]
                    vcp = getter("vcp")
                    self.VCP = unpack(">"+vcp[0], d[i+vol_point+vcp[1]:i +
                                                    vol_point+vcp[1]+DATA_SIZE[vcp[0]]])[0]
                fields = dict((k, unpack(">"+
                                         DATA_FORMAT[FIELDS[k]["format"]],
                                         d[i + FIELDS[k]["start"]:i+FIELDS[k]["start"] +
                                           DATA_SIZE[DATA_FORMAT[FIELDS[k]["format"]]]])[0]) for k in FIELDS if FIELDS[k]["priority"])
                el = fields["el_no"]
                if el < 0 or fields['rad_len'] < 0 or fields['collect_time'] < 0 or fields['el_angle'] < 0 or fields["az_angle"] < 0:
                    fields = dict((k,np.nan) for k,v in fields.iteritems())
                    el = fields["el_no"]
                else:
                    if fields["rad_stat"] in [0, 3, 5]:
                        self.elevations.update({el:{"az":[], "el_angle":[], "h_noise":[], "v_noise":[]}})
                    if fields["spot_blank"] != 7:
                        try: 
                            h = unpack(">"+
                                   DATA_FORMAT[FIELDS["h_noise"]["format"]], 
                                   d[i+fields["rad_point"]+FIELDS["h_noise"]["start"]:i+fields["rad_point"] +
                                   FIELDS["h_noise"]["start"]+DATA_SIZE[DATA_FORMAT[FIELDS["h_noise"]["format"]]]])[0]
                            v = unpack(">"+
                                   DATA_FORMAT[FIELDS["v_noise"]["format"]], 
                                   d[i+fields["rad_point"]+FIELDS["v_noise"]["start"]:i+fields["rad_point"] +
                                   FIELDS["v_noise"]["start"]+DATA_SIZE[DATA_FORMAT[FIELDS["v_noise"]["format"]]]])[0]
                        except:
                            print "RxR Noise values not found for radial at elevation angle:"+str(el)+" and az angle:"+str(fields["az_angle"])
                            h = np.nan
                            v = np.nan
                        try:
                            self._fill_el(el,h,v,fields)
                        except KeyError:
                            self.elevations.update({el:{"az":[], "el_angle":[], "h_noise":[], "v_noise":[]}})
                            self._fill_el(el,h,v,fields)
                        self.az.append(round(fields["az_angle"], self.precision))
                        self.collect_time.append(fields["collect_time"])
                i += header.msg_size * 2 - MESSAGE_HEADER_SIZE
            else:
                i += 2432
    def _fill_el(self,el,h,v,fields):
        self.elevations[el]["h_noise"].append(round(h, self.precision))
        self.elevations[el]["v_noise"].append(round(v, self.precision))
        self.elevations[el]["el_angle"].append(round(fields["el_angle"], self.precision))
        self.elevations[el]["az"].append(round(fields["az_angle"], self.precision))
    def _calc_rate(self):
	radial_t = [(self.collect_time[k+1]-self.collect_time[k])/float(1000) if (self.collect_time[k+1]-self.collect_time[k]) > 0 else np.nan for k,v in enumerate(self.az) if k < len(self.az) - 1]
        az_rate = [((self.az[k+1]-v)/radial_t[k]) if (self.az[k+1]-v) > 0 else (((self.az[k+1]-v) + 360) /radial_t[k]) for k, v in enumerate(self.az) if k < len(self.az) - 1]	
        self.az_rate = [None if isnan(rate) else round(rate, self.precision) for rate in az_rate]
	az_accel = [((az_rate[k+1]-v)/radial_t[k]) for k, v in enumerate(az_rate) if k < len(az_rate) - 1]
        running_az_accel = running_mean(az_accel, 50)
        self.az_accel = [None if isnan(accel) else round(accel, self.precision) for accel in running_az_accel]

def parse_args():
    """
    argparse 
    """
    parser = argparse.ArgumentParser(description="Decode Level II Radial Headers")
    parser.add_argument('-f', '--filename', type=str,
                        help="Level II Filename", default=None)
    parser.add_argument('-p', '--precision', type=int,
                        help="number of decimal places to round to", default=4)
    return parser.parse_args()

def main(): 
    """

    """
    args = parse_args()
    if not args.filename:
        print "Please provide a valid AR2 Level II Filename using the -f option" 
        return 1 
    else:
        r = Radial(args.filename,args.precision)
        return r.process_volume()

if __name__ == "__main__":
    sys.exit(main())
