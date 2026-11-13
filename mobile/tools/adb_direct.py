"""Minimal ADB client for the local AOSP emulator TCP port.

Used when the host adb daemon cannot create its user directory. No shell
credentials, privileged host changes, or Android security bypasses. Refuses AUTH
challenges; it works only with an emulator that already permits this connection.
"""
import argparse
import socket
import struct
import time
from pathlib import Path


class Adb:
    def __init__(self, port=5555):
        self.sock=socket.create_connection(('127.0.0.1',port),timeout=300)
        self.send(b'CNXN',0x01000000,1048576,b'host::\0')
        command,_,_,_=self.read()
        if command!=b'CNXN':
            self.sock.close()
            raise RuntimeError('Emulator ADB did not accept the connection; no authentication bypass attempted')

    def exact(self,n):
        data=b''
        while len(data)<n:
            part=self.sock.recv(n-len(data))
            if not part:raise EOFError('ADB disconnected')
            data+=part
        return data

    def send(self,command,a,b,data=b''):
        c=int.from_bytes(command,'little');self.sock.sendall(struct.pack('<6I',c,a,b,len(data),sum(data)&0xffffffff,c^0xffffffff)+data)

    def read(self):
        c,a,b,n,checksum,magic=struct.unpack('<6I',self.exact(24))
        if magic!=c^0xffffffff:raise ValueError('Invalid ADB packet')
        return c.to_bytes(4,'little'),a,b,self.exact(n)

    def open(self,service):
        self.send(b'OPEN',1,0,service.encode()+b'\0');command,remote,_,data=self.read()
        if command!=b'OKAY':raise RuntimeError('ADB service refused: '+service)
        return remote

    def shell(self,command):
        return self.stream('shell:'+command)

    def stream(self, service):
        remote=self.open(service);data=b''
        while True:
            kind,a,b,part=self.read()
            if kind==b'WRTE':data+=part;self.send(b'OKAY',1,remote)
            elif kind==b'CLSE':self.send(b'CLSE',1,remote);return data
            else:raise RuntimeError('Unexpected ADB shell packet')

    def push(self,source,destination):
        remote=self.open('sync:')
        def write(data):
            self.send(b'WRTE',1,remote,data)
            if self.read()[0]!=b'OKAY':raise RuntimeError('ADB sync write refused')
        target=(destination+',33216').encode();write(b'SEND'+struct.pack('<I',len(target))+target)
        with Path(source).open('rb') as f:
            while True:
                data=f.read(65536)
                if not data:break
                write(b'DATA'+struct.pack('<I',len(data))+data)
        write(b'DONE'+struct.pack('<I',int(time.time())))
        kind,_,_,data=self.read()
        if kind!=b'WRTE' or data[:4]!=b'OKAY':raise RuntimeError('ADB push failed')
        self.send(b'OKAY',1,remote);self.send(b'CLSE',1,remote)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('action',choices=['shell','push','screenshot']);parser.add_argument('value');parser.add_argument('destination',nargs='?');args=parser.parse_args()
    adb=Adb()
    try:
        if args.action=='shell':print(adb.shell(args.value).decode(errors='replace'),end='')
        elif args.action=='push':adb.push(args.value,args.destination)
        else:Path(args.value).write_bytes(adb.stream('exec:screencap -p'))
    finally:adb.sock.close()
